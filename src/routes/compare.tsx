import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare fees — FeeScope" },
      { name: "description", content: "Compare transaction fees across Arc, Ethereum, Solana, Sui, Movement, and other networks." },
      { property: "og:title", content: "Compare fees — FeeScope" },
      { property: "og:description", content: "Compare transaction fees across Arc, Ethereum, Solana, Sui, Movement, and more." },
    ],
  }),
  component: ComparePage,
});

const chains = [
  { name: "Arc", fee: "~$0.0001", gas: "0.001 ARC", type: "Layer 1" },
  { name: "Solana", fee: "~$0.0005", gas: "0.000005 SOL", type: "Layer 1" },
  { name: "Sui", fee: "~$0.001", gas: "0.0001 SUI", type: "Layer 1" },
  { name: "Ethereum", fee: "~$1.20", gas: "12 gwei", type: "Layer 1" },
  { name: "Base", fee: "~$0.05", gas: "0.1 gwei", type: "Layer 2" },
  { name: "Movement", fee: "~$0.002", gas: "0.0001 MOVE", type: "Move VM" },
];

function ComparePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Fee comparison</h1>
      </div>

      <p className="mb-8 max-w-2xl text-muted-foreground">
        Estimated network costs for a typical token transfer. These values are illustrative placeholders and will be replaced with live RPC data as integrations are added.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chains.map((chain) => (
          <Card key={chain.name} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{chain.name}</CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {chain.type}
                </span>
              </div>
              <CardDescription>Estimated transfer cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{chain.fee}</div>
              <p className="mt-1 text-sm text-muted-foreground">{chain.gas}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-8 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">Live comparison engine coming soon</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          We’re wiring up real-time RPC and DEX endpoints for each supported chain so you can compare swap, bridge, and gas fees with precision.
        </p>
      </div>
    </div>
  );
}
