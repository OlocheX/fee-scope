/**
 * Live address / transaction lookup across the supported networks.
 *
 * Everything here is fetched at request time from public RPC endpoints and
 * public explorer APIs. When a source is unreachable the chain is reported
 * with `status: "error"` instead of inventing data.
 */

const TIMEOUT_MS = 8000;

export type TxRow = {
  chain: string;
  hash: string;
  kind: string;
  status: "success" | "failed" | "unknown";
  from: string | null;
  to: string | null;
  feeNative: string | null;
  feeUsd: number | null;
  timestamp: string | null;
  explorerUrl: string | null;
};

export type ChainResult = {
  chain: string;
  symbol: string;
  status: "found" | "empty" | "error";
  balance: string | null;
  txs: TxRow[];
  note: string | null;
  addressUrl: string | null;
};

export type LookupResult = {
  query: string;
  kind: "address" | "hash" | "unknown";
  chains: ChainResult[];
  checkedAt: string;
};

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function classifyQuery(raw: string): "address" | "hash" | "unknown" {
  const q = raw.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(q)) return "address";
  if (/^0x[0-9a-fA-F]{64}$/.test(q)) return "hash"; // also a valid Sui/Move address
  if (BASE58.test(q) && q.length >= 32 && q.length <= 44) return "address"; // Solana / Sui digest
  if (BASE58.test(q) && q.length >= 80) return "hash"; // Solana signature
  return "unknown";
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { accept: "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function rpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const body = await getJson<{ result?: T; error?: { message: string } }>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (body.error) throw new Error(body.error.message);
  if (body.result === undefined || body.result === null) throw new Error("Not found");
  return body.result;
}

async function prices(ids: string[]): Promise<Record<string, number>> {
  try {
    const body = await getJson<Record<string, { usd?: number }>>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    );
    const out: Record<string, number> = {};
    for (const [id, v] of Object.entries(body)) if (typeof v?.usd === "number") out[id] = v.usd;
    return out;
  } catch {
    return {};
  }
}

function fmt(n: number, symbol: string): string {
  if (n === 0) return `0 ${symbol}`;
  if (n < 0.000001) return `${n.toExponential(2)} ${symbol}`;
  return `${n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")} ${symbol}`;
}

/* ------------------------------- EVM chains ------------------------------- */

type EvmChain = {
  name: string;
  symbol: string;
  decimals: number;
  rpc: string[];
  blockscout: string | null;
  explorerTx: (h: string) => string;
  explorerAddress: (a: string) => string;
  priceId: string | null;
  fixedPrice?: number;
};

const EVM_CHAINS: EvmChain[] = [
  {
    name: "Arc",
    symbol: "USDC",
    decimals: 18,
    rpc: ["https://rpc.testnet.arc.network", "https://arc-testnet.drpc.org"],
    blockscout: "https://explorer.testnet.arc.network",
    explorerTx: (h) => `https://explorer.testnet.arc.network/tx/${h}`,
    explorerAddress: (a) => `https://explorer.testnet.arc.network/address/${a}`,
    priceId: null,
    fixedPrice: 1,
  },
  {
    name: "Base",
    symbol: "ETH",
    decimals: 18,
    rpc: ["https://mainnet.base.org", "https://base.llamarpc.com"],
    blockscout: "https://base.blockscout.com",
    explorerTx: (h) => `https://basescan.org/tx/${h}`,
    explorerAddress: (a) => `https://basescan.org/address/${a}`,
    priceId: "ethereum",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    rpc: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"],
    blockscout: "https://eth.blockscout.com",
    explorerTx: (h) => `https://etherscan.io/tx/${h}`,
    explorerAddress: (a) => `https://etherscan.io/address/${a}`,
    priceId: "ethereum",
  },
];

function usdOf(chain: EvmChain, amount: number, px: Record<string, number>): number | null {
  const p = chain.fixedPrice ?? (chain.priceId ? px[chain.priceId] : undefined);
  return typeof p === "number" ? amount * p : null;
}

async function evmRpcAny<T>(chain: EvmChain, method: string, params: unknown[]): Promise<T> {
  let lastError: unknown;
  for (const url of chain.rpc) {
    try {
      return await rpc<T>(url, method, params);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("RPC unavailable");
}

async function evmTx(chain: EvmChain, hash: string, px: Record<string, number>): Promise<ChainResult> {
  const shell: ChainResult = {
    chain: chain.name,
    symbol: chain.symbol,
    status: "empty",
    balance: null,
    txs: [],
    note: null,
    addressUrl: null,
  };
  try {
    const tx = await evmRpcAny<{
      from: string;
      to: string | null;
      value: string;
      blockNumber: string | null;
    }>(chain, "eth_getTransactionByHash", [hash]);

    let feeNative: string | null = null;
    let feeUsd: number | null = null;
    let status: TxRow["status"] = "unknown";
    try {
      const receipt = await evmRpcAny<{
        gasUsed: string;
        effectiveGasPrice: string;
        status: string;
      }>(chain, "eth_getTransactionReceipt", [hash]);
      const wei = Number(BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice));
      const amount = wei / 10 ** chain.decimals;
      feeNative = fmt(amount, chain.symbol);
      feeUsd = usdOf(chain, amount, px);
      status = receipt.status === "0x1" ? "success" : "failed";
    } catch {
      status = "unknown";
    }

    return {
      ...shell,
      status: "found",
      txs: [
        {
          chain: chain.name,
          hash,
          kind: tx.to ? "Transaction" : "Contract creation",
          status,
          from: tx.from,
          to: tx.to,
          feeNative,
          feeUsd,
          timestamp: null,
          explorerUrl: chain.explorerTx(hash),
        },
      ],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lookup failed";
    if (/not found|empty rpc result/i.test(msg)) return shell;
    return { ...shell, status: "error", note: msg };
  }
}

async function evmAddress(
  chain: EvmChain,
  address: string,
  px: Record<string, number>,
): Promise<ChainResult> {
  const shell: ChainResult = {
    chain: chain.name,
    symbol: chain.symbol,
    status: "empty",
    balance: null,
    txs: [],
    note: null,
    addressUrl: chain.explorerAddress(address),
  };

  try {
    const balHex = await evmRpcAny<string>(chain, "eth_getBalance", [address, "latest"]);
    const amount = Number(BigInt(balHex)) / 10 ** chain.decimals;
    shell.balance = fmt(amount, chain.symbol);
  } catch (e) {
    return { ...shell, status: "error", note: e instanceof Error ? e.message : "RPC unavailable" };
  }

  if (chain.blockscout) {
    try {
      const body = await getJson<{
        items?: Array<{
          hash: string;
          timestamp?: string | null;
          method?: string | null;
          status?: string | null;
          from?: { hash?: string } | null;
          to?: { hash?: string } | null;
          fee?: { value?: string } | null;
        }>;
      }>(`${chain.blockscout}/api/v2/addresses/${address}/transactions`);

      const items = (body.items ?? []).slice(0, 10);
      const txs: TxRow[] = items.map((it) => {
        const wei = it.fee?.value ? Number(it.fee.value) : null;
        const amount = wei === null ? null : wei / 10 ** chain.decimals;
        return {
          chain: chain.name,
          hash: it.hash,
          kind: !it.method
            ? "Transfer"
            : /^0x[0-9a-fA-F]{8}$/.test(it.method)
              ? "Contract call"
              : it.method,
          status: it.status === "ok" ? "success" : it.status ? "failed" : "unknown",
          from: it.from?.hash ?? null,
          to: it.to?.hash ?? null,
          feeNative: amount === null ? null : fmt(amount, chain.symbol),
          feeUsd: amount === null ? null : usdOf(chain, amount, px),
          timestamp: it.timestamp ?? null,
          explorerUrl: chain.explorerTx(it.hash),
        };
      });
      return { ...shell, status: txs.length ? "found" : "empty", txs };
    } catch {
      return {
        ...shell,
        status: shell.balance && shell.balance !== `0 ${chain.symbol}` ? "found" : "empty",
        note: "Balance from RPC; transaction history source unavailable.",
      };
    }
  }

  return shell;
}

/* --------------------------------- Solana --------------------------------- */

const SOLANA_RPC = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];

async function solanaRpcAny<T>(method: string, params: unknown[]): Promise<T> {
  let lastError: unknown;
  for (const url of SOLANA_RPC) {
    try {
      return await rpc<T>(url, method, params);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("RPC unavailable");
}

function solRow(sig: string, meta: {
  fee?: number;
  err?: unknown;
  blockTime?: number | null;
}, px: Record<string, number>): TxRow {
  const sol = typeof meta.fee === "number" ? meta.fee / 1e9 : null;
  return {
    chain: "Solana",
    hash: sig,
    kind: "Transaction",
    status: meta.err ? "failed" : "success",
    from: null,
    to: null,
    feeNative: sol === null ? null : fmt(sol, "SOL"),
    feeUsd: sol !== null && px["solana"] ? sol * px["solana"]! : null,
    timestamp: meta.blockTime ? new Date(meta.blockTime * 1000).toISOString() : null,
    explorerUrl: `https://solscan.io/tx/${sig}`,
  };
}

async function solanaLookup(
  query: string,
  kind: "address" | "hash",
  px: Record<string, number>,
): Promise<ChainResult> {
  const shell: ChainResult = {
    chain: "Solana",
    symbol: "SOL",
    status: "empty",
    balance: null,
    txs: [],
    note: null,
    addressUrl: kind === "address" ? `https://solscan.io/account/${query}` : null,
  };

  try {
    if (kind === "hash") {
      const tx = await solanaRpcAny<{
        blockTime?: number | null;
        meta?: { fee?: number; err?: unknown } | null;
      }>("getTransaction", [query, { maxSupportedTransactionVersion: 0 }]);
      return {
        ...shell,
        status: "found",
        txs: [solRow(query, { ...(tx.meta ?? {}), blockTime: tx.blockTime ?? null }, px)],
      };
    }

    const balance = await solanaRpcAny<{ value: number }>("getBalance", [query]);
    shell.balance = fmt(balance.value / 1e9, "SOL");

    const sigs = await solanaRpcAny<
      Array<{ signature: string; err: unknown; blockTime: number | null }>
    >("getSignaturesForAddress", [query, { limit: 10 }]);

    const txs = (sigs ?? []).map((s) =>
      solRow(s.signature, { err: s.err, blockTime: s.blockTime }, px),
    );
    return { ...shell, status: txs.length ? "found" : "empty", txs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lookup failed";
    if (/not found|invalid|Not found/i.test(msg)) return shell;
    return { ...shell, status: "error", note: msg };
  }
}

/* ----------------------------------- Sui ---------------------------------- */

const SUI_RPC = ["https://fullnode.mainnet.sui.io:443", "https://sui-rpc.publicnode.com"];

async function suiRpcAny<T>(method: string, params: unknown[]): Promise<T> {
  let lastError: unknown;
  for (const url of SUI_RPC) {
    try {
      return await rpc<T>(url, method, params);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("RPC unavailable");
}

type SuiBlock = {
  digest: string;
  timestampMs?: string | null;
  effects?: {
    status?: { status?: string };
    gasUsed?: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
    };
  };
  transaction?: { data?: { sender?: string } };
};

function suiRow(block: SuiBlock, px: Record<string, number>): TxRow {
  const g = block.effects?.gasUsed;
  const mist = g
    ? Number(g.computationCost) + Number(g.storageCost) - Number(g.storageRebate)
    : null;
  const sui = mist === null ? null : Math.max(mist, 0) / 1e9;
  return {
    chain: "Sui",
    hash: block.digest,
    kind: "Transaction block",
    status: block.effects?.status?.status === "success" ? "success" : "failed",
    from: block.transaction?.data?.sender ?? null,
    to: null,
    feeNative: sui === null ? null : fmt(sui, "SUI"),
    feeUsd: sui !== null && px["sui"] ? sui * px["sui"]! : null,
    timestamp: block.timestampMs ? new Date(Number(block.timestampMs)).toISOString() : null,
    explorerUrl: `https://suivision.xyz/txblock/${block.digest}`,
  };
}

const SUI_OPTIONS = { showEffects: true, showInput: true };

async function suiLookup(
  query: string,
  kind: "address" | "hash",
  px: Record<string, number>,
): Promise<ChainResult> {
  const shell: ChainResult = {
    chain: "Sui",
    symbol: "SUI",
    status: "empty",
    balance: null,
    txs: [],
    note: null,
    addressUrl: kind === "address" ? `https://suivision.xyz/account/${query}` : null,
  };

  try {
    if (kind === "hash") {
      const block = await suiRpcAny<SuiBlock>("sui_getTransactionBlock", [query, SUI_OPTIONS]);
      return { ...shell, status: "found", txs: [suiRow(block, px)] };
    }

    const bal = await suiRpcAny<{ totalBalance: string }>("suix_getBalance", [query]);
    shell.balance = fmt(Number(bal.totalBalance) / 1e9, "SUI");
    shell.addressUrl = `https://suivision.xyz/account/${query}`;

    const page = await suiRpcAny<{ data?: SuiBlock[] }>("suix_queryTransactionBlocks", [
      { filter: { FromAddress: query }, options: SUI_OPTIONS },
      null,
      10,
      true,
    ]);
    const txs = (page.data ?? []).map((b) => suiRow(b, px));
    return { ...shell, status: txs.length ? "found" : "empty", txs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lookup failed";
    if (/not found|could not find|invalid/i.test(msg)) return shell;
    return { ...shell, status: "error", note: msg };
  }
}

/* -------------------------------- Movement -------------------------------- */

const MOVE_REST = [
  "https://mainnet.movementnetwork.xyz/v1",
  "https://full.mainnet.movementinfra.xyz/v1",
];

type MoveTx = {
  hash: string;
  success?: boolean;
  sender?: string;
  gas_used?: string;
  gas_unit_price?: string;
  timestamp?: string;
  type?: string;
  payload?: { function?: string };
};

function moveRow(tx: MoveTx, px: Record<string, number>): TxRow {
  const octas =
    tx.gas_used && tx.gas_unit_price ? Number(tx.gas_used) * Number(tx.gas_unit_price) : null;
  const move = octas === null ? null : octas / 1e8;
  return {
    chain: "Movement",
    hash: tx.hash,
    kind: tx.payload?.function?.split("::").slice(-1)[0] ?? tx.type ?? "Transaction",
    status: tx.success === undefined ? "unknown" : tx.success ? "success" : "failed",
    from: tx.sender ?? null,
    to: null,
    feeNative: move === null ? null : fmt(move, "MOVE"),
    feeUsd: move !== null && px["movement"] ? move * px["movement"]! : null,
    timestamp: tx.timestamp ? new Date(Number(tx.timestamp) / 1000).toISOString() : null,
    explorerUrl: `https://explorer.movementnetwork.xyz/txn/${tx.hash}?network=mainnet`,
  };
}

async function moveGet<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (const base of MOVE_REST) {
    try {
      return await getJson<T>(`${base}${path}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("REST unavailable");
}

async function movementLookup(
  query: string,
  kind: "address" | "hash",
  px: Record<string, number>,
): Promise<ChainResult> {
  const shell: ChainResult = {
    chain: "Movement",
    symbol: "MOVE",
    status: "empty",
    balance: null,
    txs: [],
    note: null,
    addressUrl:
      kind === "address"
        ? `https://explorer.movementnetwork.xyz/account/${query}?network=mainnet`
        : null,
  };

  try {
    if (kind === "hash") {
      const tx = await moveGet<MoveTx>(`/transactions/by_hash/${query}`);
      return { ...shell, status: "found", txs: [moveRow(tx, px)] };
    }

    const list = await moveGet<MoveTx[]>(`/accounts/${query}/transactions?limit=10`);
    const txs = (list ?? []).map((t) => moveRow(t, px));
    return { ...shell, status: txs.length ? "found" : "empty", txs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lookup failed";
    if (/404|not found|invalid/i.test(msg)) return shell;
    return { ...shell, status: "error", note: msg };
  }
}

/* --------------------------------- Runner --------------------------------- */

export async function lookup(rawQuery: string): Promise<LookupResult> {
  const query = rawQuery.trim();
  const kind = classifyQuery(query);

  if (kind === "unknown") {
    return { query, kind, chains: [], checkedAt: new Date().toISOString() };
  }

  const px = await prices(["ethereum", "solana", "sui", "movement"]);
  const isEvmAddress = /^0x[0-9a-fA-F]{40}$/.test(query);
  const isHex64 = /^0x[0-9a-fA-F]{64}$/.test(query);
  const isBase58 = BASE58.test(query);

  const jobs: Array<Promise<ChainResult>> = [];

  if (isEvmAddress) {
    for (const c of EVM_CHAINS) jobs.push(evmAddress(c, query, px));
  } else if (isHex64) {
    // Ambiguous: an EVM tx hash, or a Sui / Movement account address.
    for (const c of EVM_CHAINS) jobs.push(evmTx(c, query, px));
    jobs.push(suiLookup(query, "address", px));
    jobs.push(movementLookup(query, "address", px));
    jobs.push(movementLookup(query, "hash", px));
  } else if (isBase58) {
    if (kind === "hash") {
      jobs.push(solanaLookup(query, "hash", px));
    } else {
      jobs.push(solanaLookup(query, "address", px));
      jobs.push(suiLookup(query, "hash", px));
    }
  }

  const settled = await Promise.all(jobs);

  // Collapse duplicate chain entries (e.g. Movement address + hash attempts).
  const byChain = new Map<string, ChainResult>();
  for (const r of settled) {
    const existing = byChain.get(r.chain);
    if (!existing) {
      byChain.set(r.chain, r);
      continue;
    }
    if (r.status === "found" && existing.status !== "found") byChain.set(r.chain, r);
    else if (r.status === "found" && existing.status === "found") {
      byChain.set(r.chain, { ...existing, txs: [...existing.txs, ...r.txs] });
    }
  }

  const order = ["Arc", "Solana", "Sui", "Movement", "Base", "Ethereum"];
  const chains = [...byChain.values()].sort(
    (a, b) => order.indexOf(a.chain) - order.indexOf(b.chain),
  );

  return { query, kind, chains, checkedAt: new Date().toISOString() };
}
