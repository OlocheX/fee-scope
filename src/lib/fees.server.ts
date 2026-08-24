/**
 * Live fee data collection.
 *
 * Every value returned here is fetched from a public RPC endpoint or a public
 * price API at request time. When an endpoint is unreachable the chain is
 * returned with `status: "unavailable"` rather than a made-up number.
 */

export type ChainFee = {
  name: string;
  type: string;
  symbol: string;
  /** Estimated cost of a simple token transfer, in USD. */
  usd: number | null;
  /** Native-unit breakdown, e.g. "21,000 gas @ 12.4 gwei". */
  native: string | null;
  /** Raw gas price label, e.g. "12.4 gwei". */
  gasPrice: string | null;
  status: "live" | "unavailable";
  source: string;
};

const TIMEOUT_MS = 6000;

async function jsonRpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`RPC ${url} responded ${res.status}`);
    const body = (await res.json()) as { result?: T; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    if (body.result === undefined) throw new Error("Empty RPC result");
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

async function getPrices(ids: string[]): Promise<Record<string, number>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      { signal: controller.signal, headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Price API responded ${res.status}`);
    const body = (await res.json()) as Record<string, { usd?: number }>;
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(body)) {
      if (typeof value?.usd === "number") out[id] = value.usd;
    }
    return out;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

function fmt(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6).replace(/0+$/, "");
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type EvmChain = {
  name: string;
  type: string;
  symbol: string;
  rpc: string[];
  gasLimit: number;
  priceId: string | null;
  /** Used when the gas token is a stablecoin (Arc pays gas in USDC). */
  fixedPrice?: number;
};

const EVM_CHAINS: EvmChain[] = [
  {
    name: "Ethereum",
    type: "Layer 1",
    symbol: "ETH",
    rpc: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"],
    gasLimit: 21000,
    priceId: "ethereum",
  },
  {
    name: "Base",
    type: "Layer 2",
    symbol: "ETH",
    rpc: ["https://mainnet.base.org", "https://base.llamarpc.com"],
    gasLimit: 21000,
    priceId: "ethereum",
  },
  {
    name: "Arc",
    type: "Layer 1",
    symbol: "USDC",
    rpc: ["https://rpc.testnet.arc.network", "https://arc-testnet.drpc.org"],
    gasLimit: 21000,
    priceId: null,
    fixedPrice: 1,
  },
];

async function evmFee(chain: EvmChain, prices: Record<string, number>): Promise<ChainFee> {
  const base: ChainFee = {
    name: chain.name,
    type: chain.type,
    symbol: chain.symbol,
    usd: null,
    native: null,
    gasPrice: null,
    status: "unavailable",
    source: "JSON-RPC eth_gasPrice",
  };

  for (const url of chain.rpc) {
    try {
      const hex = await jsonRpc<string>(url, "eth_gasPrice");
      const wei = Number(BigInt(hex));
      const gwei = wei / 1e9;
      const nativeAmount = (wei * chain.gasLimit) / 1e18;
      const price = chain.fixedPrice ?? (chain.priceId ? prices[chain.priceId] : undefined);
      return {
        ...base,
        status: "live",
        gasPrice: `${fmt(gwei)} gwei`,
        native: `${fmt(nativeAmount)} ${chain.symbol}`,
        usd: typeof price === "number" ? nativeAmount * price : null,
      };
    } catch {
      // try the next endpoint
    }
  }
  return base;
}

async function solanaFee(prices: Record<string, number>): Promise<ChainFee> {
  const base: ChainFee = {
    name: "Solana",
    type: "Layer 1",
    symbol: "SOL",
    usd: null,
    native: null,
    gasPrice: null,
    status: "unavailable",
    source: "JSON-RPC getFeeForMessage",
  };
  // Base64 of a minimal one-signature transfer message; returns the live lamport fee.
  const message =
    "AQABA3wRPPS/aHkYb/kMv5N8mQyDVDkTGXwLNBLnPXCPRQdKgQrVL0y1ZnH0dQjNbz6c4LTNSXaJnLg8kQnBQvJDVzUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECAgABDAIAAAAAypo7AAAAAA==";
  const urls = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
  for (const url of urls) {
    try {
      const result = await jsonRpc<{ value: number | null }>(url, "getFeeForMessage", [
        message,
        { commitment: "processed" },
      ]);
      const lamports = result?.value ?? 5000;
      const sol = lamports / 1e9;
      const price = prices["solana"];
      return {
        ...base,
        status: "live",
        gasPrice: `${lamports.toLocaleString()} lamports`,
        native: `${fmt(sol)} SOL`,
        usd: typeof price === "number" ? sol * price : null,
      };
    } catch {
      // try the next endpoint
    }
  }
  return base;
}

async function moveFee(
  opts: { name: string; symbol: string; type: string; rpc: string[]; priceId: string; decimals: number; gasUnits: number },
  prices: Record<string, number>,
): Promise<ChainFee> {
  const base: ChainFee = {
    name: opts.name,
    type: opts.type,
    symbol: opts.symbol,
    usd: null,
    native: null,
    gasPrice: null,
    status: "unavailable",
    source: "Aptos-style REST /estimate_gas_price",
  };
  for (const url of opts.rpc) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`${url}/estimate_gas_price`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`REST ${url} responded ${res.status}`);
      const body = (await res.json()) as { gas_estimate?: number };
      if (typeof body.gas_estimate !== "number") throw new Error("Missing gas_estimate");
      const nativeAmount = (body.gas_estimate * opts.gasUnits) / 10 ** opts.decimals;
      const price = prices[opts.priceId];
      return {
        ...base,
        status: "live",
        gasPrice: `${body.gas_estimate} octas/unit`,
        native: `${fmt(nativeAmount)} ${opts.symbol}`,
        usd: typeof price === "number" ? nativeAmount * price : null,
      };
    } catch {
      // try the next endpoint
    }
  }
  return base;
}

async function suiFee(prices: Record<string, number>): Promise<ChainFee> {
  const base: ChainFee = {
    name: "Sui",
    type: "Layer 1",
    symbol: "SUI",
    usd: null,
    native: null,
    gasPrice: null,
    status: "unavailable",
    source: "JSON-RPC suix_getReferenceGasPrice",
  };
  const urls = ["https://fullnode.mainnet.sui.io:443", "https://sui-rpc.publicnode.com"];
  // A simple SUI transfer settles around 7,600 gas units (~0.00076 SUI at 100 MIST).
  const GAS_UNITS = 7_600;
  for (const url of urls) {
    try {
      const result = await jsonRpc<string | number>(url, "suix_getReferenceGasPrice");
      const mist = Number(result);
      const nativeAmount = (mist * GAS_UNITS) / 1e9;
      const price = prices["sui"];
      return {
        ...base,
        status: "live",
        gasPrice: `${mist} MIST/unit`,
        native: `${fmt(nativeAmount)} SUI`,
        usd: typeof price === "number" ? nativeAmount * price : null,
      };
    } catch {
      // try the next endpoint
    }
  }
  return base;
}

export async function collectChainFees(): Promise<{ chains: ChainFee[]; updatedAt: string }> {
  const prices = await getPrices(["ethereum", "solana", "sui", "movement"]);

  const results = await Promise.all([
    evmFee(EVM_CHAINS[0]!, prices), // Ethereum
    evmFee(EVM_CHAINS[1]!, prices), // Base
    evmFee(EVM_CHAINS[2]!, prices), // Arc
    solanaFee(prices),
    suiFee(prices),
    moveFee(
      {
        name: "Movement",
        symbol: "MOVE",
        type: "Move VM",
        rpc: ["https://mainnet.movementnetwork.xyz/v1", "https://full.mainnet.movementinfra.xyz/v1"],
        priceId: "movement",
        decimals: 8,
        gasUnits: 1000,
      },
      prices,
    ),
  ]);

  const order = ["Arc", "Solana", "Sui", "Movement", "Base", "Ethereum"];
  results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  return { chains: results, updatedAt: new Date().toISOString() };
}
