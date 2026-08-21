# Fee Comparator on Arc — Product Plan

## Vision
A clean, institutional-grade fee comparison tool that lets users compare transaction costs across Arc, Ethereum, Solana, Sui, Movement, and other supported chains. Users can view transactions publicly by address or hash, connect their wallet to see personal history, and save comparisons, watchlists, and labeled transactions.

## Core Features

1. **Multi-chain fee comparison**
   - Compare gas fees, transaction costs, swap/DEX fees, and bridge fees.
   - Supported networks: Ethereum, Solana, Sui, Movement, Arc, with room to add more.
   - Display fees in USD, native token, and gwei/lamports/MIST-equivalent units.
   - Highlight cheapest/fastest route or chain for a given action.

2. **Transaction viewing**
   - Public scan: search any transaction hash, address, or block/slot.
   - Personal view: connect a wallet to see the user's own transaction history across supported chains.
   - Transaction detail page with status, fees, tokens transferred, and links to explorers.

3. **User accounts & persistence**
   - Sign up / sign in via Lovable Cloud (email + social providers).
   - Save comparison sets and preferred chains.
   - Watchlists for addresses and transaction patterns.
   - Transaction labels and private notes.
   - User preferences for currency, theme, and default chains.

4. **Clean/institutional design**
   - Professional, finance-product aesthetic: navy and slate palette, crisp typography, generous whitespace, precise data tables.
   - Responsive layout with strong information hierarchy.
   - Subtle motion for data updates and state transitions.

## Technical Foundation

- **Framework**: TanStack Start (already in place).
- **Backend**: Lovable Cloud (Supabase) for auth, PostgreSQL database, and server functions.
- **Blockchain data**: RPC clients and public indexers for each chain; abstracted into a fee aggregator layer.
- **Wallet**: Wallet adapter supporting EVM (MetaMask, WalletConnect) and Solana (Phantom, Solflare); Sui and Movement adapters added as needed.
- **Security**: Row-level security (RLS) on all user data; wallet signatures used for linking addresses, never for storing private keys.

## Database Schema (initial)

- `profiles` — user profile linked to auth.
- `user_preferences` — currency, theme, default chains.
- `saved_comparisons` — comparison name, chain selections, fee types, and saved result snapshot.
- `watchlists` — addresses/accounts per chain with labels.
- `transaction_labels` — private labels/notes tied to a transaction hash and user.
- `user_roles` (security best practice) — roles for admin/moderator access.

## Phased Delivery

### Phase 1: Foundation
- Enable Lovable Cloud.
- Configure auth (email + OAuth) and set up the authenticated route layout.
- Establish the clean/institutional design system (colors, typography, tokens, header/footer).
- Build the home page introducing the fee comparator and its value proposition.

### Phase 2: Fee Comparison Engine
- Create a fee aggregator service that fetches fee estimates from chain RPCs/indexers.
- Support gas-only fees first for Ethereum, Arc, Sui, Movement, and Solana.
- Build a comparison table with sorting, filters, and USD conversion.
- Add simple charts/visualizations for fee trends.

### Phase 3: Transaction Viewing
- Public transaction search by hash or address.
- Implement chain-specific transaction parsers and detail pages.
- Add wallet connection and a personalized transaction history view.
- Sync/link wallet addresses to the user's profile.

### Phase 4: User Data & Personalization
- Save comparison sets and allow re-running them.
- Watchlists for addresses with change detection.
- Transaction labels and private notes.
- User settings page with preferences and linked wallets.

### Phase 5: Expansion
- Add swap/bridge fee comparison (e.g., DEX aggregator quotes, CCTP bridge fees).
- Add more chains on request.
- Export/share comparison reports.

## Open Questions to Resolve During Build
- Arc network status and exact RPC/explorer endpoints available at build time.
- Which specific bridges or DEXs to prioritize for fee comparison.
- Preferred wallet adapter libraries for Arc if not standard EVM-compatible tooling.

## First Milestone
Enable Lovable Cloud, scaffold the authenticated app shell, and build a public-facing home page with a hero, supported-chains preview, and navigation to the fee comparator (initially with placeholder fee data).