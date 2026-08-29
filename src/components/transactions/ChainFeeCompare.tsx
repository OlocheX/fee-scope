import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getChainFees } from "@/lib/fees.functions";

export const SUPPORTED_CHAINS = [
  "Arc",
  "Ethereum",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "Avalanche",
  "BNB Chain",
  "Celo",
  "Solana",
  "Sui",
  "Movement",
  "Aptos",
] as const;


export const feesQueryOptions = queryOptions({
  queryKey: ["chain-fees"],
  queryFn: () => getChainFees(),
  staleTime: 60_000,
});

type AddressStat = {
  chain: string;
  count: number;
  totalUsd: number | null;
  avgUsd: number | null;
};

function money(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(6).replace(/0+$/, "")}`;
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

function Column({
  label,
  value,
  onChange,
  network,
  stat,
  cheaper,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  network: { usd: number | null; native: string | null; status: string } | undefined;
  stat: AddressStat | undefined;
  cheaper: boolean;
  options: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {cheaper && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Cheaper now
          </span>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>


      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Current transfer cost</dt>
          <dd className="text-2xl font-semibold text-foreground">
            {network && network.status === "live" ? money(network.usd) : "—"}
          </dd>
          {network?.native && (
            <dd className="text-xs text-muted-foreground">{network.native}</dd>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div>
            <dt className="text-xs text-muted-foreground">Txns</dt>
            <dd className="font-medium text-foreground">{stat?.count ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Avg fee</dt>
            <dd className="font-medium text-foreground">{money(stat?.avgUsd ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total paid</dt>
            <dd className="font-medium text-foreground">{money(stat?.totalUsd ?? null)}</dd>
          </div>
        </div>
      </dl>
    </div>
  );
}

export function ChainFeeCompare({
  chainA,
  chainB,
  onChangeA,
  onChangeB,
  addressStats,
  hasAddressData,
}: {
  chainA: string;
  chainB: string;
  onChangeA: (next: string) => void;
  onChangeB: (next: string) => void;
  addressStats: AddressStat[];
  hasAddressData: boolean;
}) {
  const { data } = useSuspenseQuery(feesQueryOptions);

  const byName = useMemo(
    () => Object.fromEntries(data.chains.map((c) => [c.name, c])),
    [data.chains],
  );
  const statByName = useMemo(
    () => Object.fromEntries(addressStats.map((s) => [s.chain, s])),
    [addressStats],
  );

  const a = byName[chainA];
  const b = byName[chainB];
  const aUsd = a?.status === "live" ? a.usd : null;
  const bUsd = b?.status === "live" ? b.usd : null;

  let verdict = "Live fees unavailable for one of the selected networks.";
  if (aUsd !== null && bUsd !== null && aUsd > 0 && bUsd > 0) {
    const cheap = aUsd <= bUsd ? chainA : chainB;
    const ratio = Math.max(aUsd, bUsd) / Math.min(aUsd, bUsd);
    verdict = `${cheap} is currently ${ratio >= 1.05 ? `${ratio.toFixed(1)}× cheaper` : "marginally cheaper"} for a simple transfer.`;
  }

  return (
    <Card className="mb-8">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Compare two chains</CardTitle>
        <CardDescription>
          {hasAddressData
            ? "Live transfer cost side by side, plus what this address actually paid on each network."
            : "Live transfer cost side by side. Search an address to also see its historical fee spend."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <Column
            label="Chain A"
            value={chainA}
            onChange={onChangeA}
            network={a}
            stat={statByName[chainA]}
            cheaper={aUsd !== null && bUsd !== null && aUsd < bUsd}
          />
          <Column
            label="Chain B"
            value={chainB}
            onChange={onChangeB}
            network={b}
            stat={statByName[chainB]}
            cheaper={aUsd !== null && bUsd !== null && bUsd < aUsd}
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{verdict}</p>
      </CardContent>
    </Card>
  );
}
