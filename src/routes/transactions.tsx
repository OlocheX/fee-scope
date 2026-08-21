import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — FeeScope" },
      { name: "description", content: "Search public transactions across Arc, Ethereum, Solana, Sui, Movement, and more." },
      { property: "og:title", content: "Transactions — FeeScope" },
      { property: "og:description", content: "Search public transactions across Arc, Ethereum, Solana, Sui, Movement, and more." },
    ],
  }),
  component: TransactionsPage,
});

const exampleTransactions = [
  { hash: "0x8a2c...b4e1", chain: "Ethereum", type: "Transfer", fee: "$1.20", time: "2 min ago" },
  { hash: "0x3f7d...a9c2", chain: "Arc", type: "Swap", fee: "$0.0002", time: "5 min ago" },
  { hash: "5xKp...8mNq", chain: "Solana", type: "Transfer", fee: "$0.0005", time: "12 min ago" },
  { hash: "0x9e4b...f2a8", chain: "Sui", type: "Bridge", fee: "$0.001", time: "18 min ago" },
];

function TransactionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Transaction explorer</h1>
      </div>

      <div className="mb-8 flex max-w-2xl gap-2">
        <Input placeholder="Search by transaction hash, address, or block…" />
        <Button>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>

      <div className="grid gap-4">
        {exampleTransactions.map((tx) => (
          <Card key={tx.hash} className="transition-shadow hover:shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-mono">{tx.hash}</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {tx.chain}
                </span>
              </div>
              <CardDescription>{tx.time}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tx.type}</span>
                <span className="font-medium text-foreground">Fee: {tx.fee}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Live multi-chain transaction search is coming soon. Sign in to connect your wallet and view personal history.
        </p>
      </div>
    </div>
  );
}
