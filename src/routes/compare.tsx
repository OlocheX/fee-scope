import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getChainFees } from "@/lib/fees.functions";

const feesQueryOptions = queryOptions({
  queryKey: ["chain-fees"],
  queryFn: () => getChainFees(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare fees — FeeScope" },
      { name: "description", content: "Live transaction fee estimates across Arc, Ethereum, Solana, Sui, Movement, and Base, sourced directly from public RPC endpoints." },
      { property: "og:title", content: "Compare fees — FeeScope" },
      { property: "og:description", content: "Live transaction fee estimates across Arc, Ethereum, Solana, Sui, Movement, and Base." },
      { property: "og:url", content: "https://fee-scope.lovable.app/compare" },
    ],
    links: [{ rel: "canonical", href: "https://fee-scope.lovable.app/compare" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(feesQueryOptions),
  component: ComparePage,
});

function formatUsd(usd: number | null): string {
  if (usd === null) return "—";
  if (usd < 0.01) return `$${usd.toFixed(6).replace(/0+$/, "")}`;
  return `$${usd.toFixed(usd < 1 ? 4 : 2)}`;
}

function formatUpdatedTime(updatedAt: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(updatedAt));
}

function ComparePage() {
  const { data, isFetching, refetch } = useSuspenseQuery(feesQueryOptions);
  const liveCount = data.chains.filter((c) => c.status === "live").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Fee comparison</h1>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-8 max-w-2xl">
        <p className="text-muted-foreground">
          Live cost of a simple native token transfer, computed from each network's current
          gas price and spot token price. {liveCount} of {data.chains.length} networks reporting.
        </p>
        <p className="mt-2 text-xs text-muted-foreground" suppressHydrationWarning>
          Updated {formatUpdatedTime(data.updatedAt)} · refreshes automatically every minute
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.chains.map((chain) => (
          <Card key={chain.name} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{chain.name}</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {chain.type}
                </span>
              </div>
              <CardDescription>
                {chain.status === "live" ? "Live transfer cost" : "Network not reporting"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {chain.status === "live" ? formatUsd(chain.usd) : "—"}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {chain.status === "live"
                  ? [chain.native, chain.gasPrice].filter(Boolean).join(" · ")
                  : "Public endpoint unreachable right now"}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    chain.status === "live" ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-xs text-muted-foreground">{chain.source}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6">
        <h2 className="text-base font-semibold text-foreground">Methodology</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>EVM networks: <code>eth_gasPrice</code> × 21,000 gas for a native transfer.</li>
          <li>Solana: protocol signature fee plus the live median prioritization fee.</li>
          <li>Sui: reference gas price × typical transfer gas budget.</li>
          <li>Movement: <code>/estimate_gas_price</code> × typical transfer gas units.</li>
          <li>USD conversion uses public spot prices; Arc gas is denominated in USDC.</li>
        </ul>
      </div>
    </div>
  );
}
