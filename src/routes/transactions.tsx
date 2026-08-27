import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Loader2, Search } from "lucide-react";
import { lookupQuery } from "@/lib/lookup.functions";
import {
  ChainFeeCompare,
  SUPPORTED_CHAINS,
  feesQueryOptions,
} from "@/components/transactions/ChainFeeCompare";

export const Route = createFileRoute("/transactions")({
  validateSearch: (search: Record<string, unknown>): { q?: string; a?: string; b?: string } => {
    const out: { q?: string; a?: string; b?: string } = {};
    if (typeof search["q"] === "string" && search["q"].length > 0)
      out.q = search["q"].slice(0, 120);
    if (typeof search["a"] === "string" && SUPPORTED_CHAINS.includes(search["a"] as never))
      out.a = search["a"];
    if (typeof search["b"] === "string" && SUPPORTED_CHAINS.includes(search["b"] as never))
      out.b = search["b"];
    return out;
  },
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(feesQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Transaction & address explorer — FeeScope" },
      {
        name: "description",
        content:
          "Look up any wallet address or transaction hash across Arc, Ethereum, Base, Solana, Sui, and Movement, with live fees in USD.",
      },
      { property: "og:title", content: "Transaction & address explorer — FeeScope" },
      {
        property: "og:description",
        content:
          "Look up any wallet address or transaction hash across Arc, Ethereum, Base, Solana, Sui, and Movement, with live fees in USD.",
      },
    ],
  }),
  component: TransactionsPage,
});

function shorten(value: string, size = 6) {
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

function formatUsd(value: number | null) {
  if (value === null) return null;
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(6).replace(/0+$/, "")}`;
  return `$${value.toFixed(2)}`;
}

function formatWhen(iso: string | null) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return new Date(then).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function TransactionsPage() {
  const { q = "", a: chainA = "Arc", b: chainB = "Ethereum" } = Route.useSearch();
  const navigate = useNavigate({ from: "/transactions" });
  const [input, setInput] = useState(q);
  const runLookup = useServerFn(lookupQuery);

  const { data, isFetching, error } = useQuery({
    queryKey: ["lookup", q],
    queryFn: () => runLookup({ data: { q } }),
    enabled: q.trim().length > 0,
    staleTime: 30_000,
  });

  const chainsWithHits = data?.chains.filter((c) => c.status === "found") ?? [];
  const otherChains = data?.chains.filter((c) => c.status !== "found") ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Transaction explorer
        </h1>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Paste a wallet address or a transaction hash. FeeScope detects the format and queries Arc,
        Ethereum, Base, Solana, Sui, and Movement in parallel using public RPCs and explorers.
      </p>

      <form
        className="mb-8 flex max-w-2xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ search: { q: input.trim() } });
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x… address or hash, or a Solana / Sui address"
          spellCheck={false}
          aria-label="Address or transaction hash"
        />
        <Button type="submit" disabled={!input.trim() || isFetching}>
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Search
        </Button>
      </form>

      {!q && (
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          Enter an address or hash above to begin. Supported formats: EVM addresses and hashes
          (0x…), Solana addresses and signatures, Sui addresses and digests, and Movement addresses
          and hashes.
        </div>
      )}

      {q && data?.kind === "unknown" && (
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Unrecognised format.</span> That doesn't
          look like a supported address or transaction hash.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          The lookup failed. Please try again.
        </div>
      )}

      {q && isFetching && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Querying six networks…
        </div>
      )}

      {data && data.kind !== "unknown" && (
        <div className="space-y-4">
          {chainsWithHits.length === 0 && !isFetching && (
            <div className="rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              No activity found for{" "}
              <span className="font-mono text-foreground">{shorten(data.query, 10)}</span> on any
              supported network.
            </div>
          )}

          {chainsWithHits.map((chain) => (
            <Card key={chain.chain}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{chain.chain}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {chain.balance && (
                      <span>
                        Balance:{" "}
                        <span className="font-medium text-foreground">{chain.balance}</span>
                      </span>
                    )}
                    {chain.addressUrl && (
                      <a
                        href={chain.addressUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                {chain.note && <CardDescription>{chain.note}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                {chain.txs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent transactions.</p>
                )}
                {chain.txs.map((tx) => (
                  <div
                    key={`${tx.chain}-${tx.hash}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={tx.explorerUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm text-foreground hover:underline"
                        >
                          {shorten(tx.hash, 8)}
                        </a>
                        <span
                          className={
                            tx.status === "success"
                              ? "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              : tx.status === "failed"
                                ? "rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                                : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          }
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {tx.kind}
                        {tx.from ? ` · from ${shorten(tx.from)}` : ""}
                        {tx.to ? ` → ${shorten(tx.to)}` : ""}
                        {formatWhen(tx.timestamp) ? ` · ${formatWhen(tx.timestamp)}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium text-foreground">
                        {formatUsd(tx.feeUsd) ?? tx.feeNative ?? "—"}
                      </div>
                      {tx.feeNative && formatUsd(tx.feeUsd) && (
                        <div className="text-xs text-muted-foreground">{tx.feeNative}</div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {otherChains.length > 0 && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
              No results from:{" "}
              {otherChains
                .map((c) => `${c.chain}${c.status === "error" ? " (unreachable)" : ""}`)
                .join(", ")}
              .
            </div>
          )}
        </div>
      )}
    </div>
  );
}
