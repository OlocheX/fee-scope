# FeeScope — Backend Reference

This document describes everything that runs on the server side of FeeScope:
the database schema, security model, authentication, and the server functions
that fetch live blockchain fee and transaction data.

Stack: **TanStack Start (React 19 + Vite)** on the frontend, **Postgres +
Auth (Supabase-compatible)** for persistence, and **server functions** running
in an edge runtime for all outbound RPC calls.

---

## 1. Database schema

Full SQL lives in [`schema.sql`](./schema.sql) (a concatenation of every
migration applied to the project, in order). Summary:

### `public.profiles`
| column | type | notes |
| --- | --- | --- |
| `id` | `uuid` PK | references `auth.users(id)` on delete cascade |
| `email` | `text` | copied from the auth user on signup |
| `display_name` | `text` | |
| `avatar_url` | `text` | |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by trigger |

### `public.user_preferences`
| column | type | notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` | unique, references `auth.users(id)` |
| `default_chains` | `text[]` | networks pinned in the comparator |
| `currency` | `text` | defaults to `USD` |
| `theme` | `text` | `system` by default |
| `created_at` / `updated_at` | `timestamptz` | |

### `public.user_roles`
| column | type | notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `user_id` | `uuid` | references `auth.users(id)` |
| `role` | `app_role` enum | `admin` \| `moderator` \| `user` |
| | | unique on `(user_id, role)` |

Roles are deliberately stored in their **own table**, never on `profiles`.
Storing a role next to user-editable profile data allows privilege escalation.

---

## 2. Security model

Three layers, all enforced in the database:

1. **GRANTs** — Postgres privileges are granted explicitly per table to
   `authenticated` and `service_role`. Without this the API layer cannot reach
   a table at all, regardless of policies.
2. **Row Level Security** — enabled on every table in `public`.
3. **Policies** — every row is scoped to `auth.uid()`; writes to `user_roles`
   are gated behind an admin check.

### Role checking without recursion

```sql
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;
```

`security definer` lets the function read `user_roles` without re-triggering
the RLS policy that calls it — this avoids infinite policy recursion.

### Automatic provisioning on signup

A `handle_new_user()` trigger on `auth.users` inserts a matching `profiles`
row and a default `user_preferences` row, so no client code has to create
them (and no client can forge them).

---

## 3. Authentication

- Email/password plus Google OAuth.
- Sessions are handled by the auth service; the client never stores raw
  credentials.
- Protected pages sit under the `_authenticated/` route subtree, which
  redirects to `/auth` before any loader runs.
- Server functions that need identity use a `requireSupabaseAuth`
  middleware, which validates the bearer token and exposes `userId` and a
  request-scoped, RLS-respecting database client.
- The admin client (which bypasses RLS) is only imported *inside* handlers,
  after the caller has been verified — it never enters the browser bundle.

---

## 4. Server functions (live chain data)

All outbound network calls happen on the server. Nothing in the browser talks
to an RPC endpoint directly, which keeps endpoints swappable and avoids CORS
and rate-limit issues per visitor.

### `src/lib/fees.server.ts` → `collectChainFees()`

Returns `{ chains: ChainFee[], updatedAt: string }`.

```ts
type ChainFee = {
  name: string;
  type: string;          // "Layer 1" | "Layer 2" | "Move VM"
  symbol: string;
  usd: number | null;    // cost of a simple transfer, in USD
  native: string | null; // e.g. "0.000021 ETH"
  gasPrice: string | null;
  status: "live" | "unavailable";
  source: string;        // which RPC method produced the number
};
```

**Networks covered (13):** Arc, Ethereum, Base, Arbitrum, Optimism, Polygon,
Avalanche, BNB Chain, Celo, Solana, Sui, Movement, Aptos.

**Fee methodology per family**

| Family | RPC method | Calculation |
| --- | --- | --- |
| EVM chains | `eth_gasPrice` | `gasPrice × 21,000` gas (a plain transfer) |
| Solana | `getRecentPrioritizationFees` | 5,000 lamport signature fee + median priority fee × 300 CU |
| Sui | `suix_getReferenceGasPrice` | reference price (MIST) × ~7,600 gas units |
| Move VM (Movement, Aptos) | REST `/estimate_gas_price` | `gas_estimate` (octas) × 1,000 units |

Every chain has **two independent RPC endpoints**; the second is tried when
the first fails or times out (6s abort). If both fail the chain is returned
with `status: "unavailable"` — the app never fabricates a number.

**USD conversion** uses CoinGecko's simple-price API, with a Coinbase spot
price fallback per symbol when CoinGecko is unreachable or rate limited.
Arc pays gas in USDC, so it is priced at a fixed $1 rather than via an oracle.

### `src/lib/lookup.server.ts` → wallet & transaction lookup

Takes a free-text query and classifies it:

- `0x…` 40 hex chars → EVM address
- `0x…` 64 hex chars → EVM transaction hash
- base58, 32–44 chars → Solana address
- base58, 87–88 chars → Solana signature
- `0x…` 64 hex → also probed as Sui / Movement

It then fans out **in parallel** across the supported networks and returns,
per chain: native balance, up to 10 recent transactions (hash, timestamp,
status, fee in native + USD, counterparty, method), and a deep link to that
chain's block explorer. EVM history comes from Blockscout-compatible REST
APIs; balances come from `eth_getBalance` / chain-native equivalents.

Unreachable endpoints surface as `"Endpoint unreachable"` rather than an
empty result, so a network outage is never mistaken for an empty wallet.

### Exposure layer

`*.server.ts` files are server-only (the bundler refuses to ship them to the
browser). They are exposed through thin `*.functions.ts` wrappers:

```ts
import { createServerFn } from "@tanstack/react-start";
import { collectChainFees } from "./fees.server";

export const getChainFees = createServerFn({ method: "GET" })
  .handler(async () => collectChainFees());
```

The frontend calls these through TanStack Query, with a 60-second refresh on
the comparison page and route loaders prefetching on first paint.

---

## 5. Public endpoints

- `GET /sitemap.xml` — generated at request time from the public route list.
- `/robots.txt` — references the sitemap.

Anything intended for external callers (webhooks, cron) belongs under
`src/routes/api/public/*` and must verify the caller inside the handler.

---

## 6. Running the schema elsewhere

```bash
psql "$DATABASE_URL" -f docs/schema.sql
```

The migrations assume an `auth.users` table and an `auth.uid()` function
exist (both provided by Supabase Auth). On a plain Postgres install you would
substitute your own users table and session-claim function.
