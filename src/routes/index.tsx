import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Globe, Shield, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FeeScope — Cross-chain fee comparison" },
      { name: "description", content: "Compare transaction fees across Arc, Ethereum, Solana, Sui, Movement, and more. View public transactions and connect your wallet for personalized history." },
      { property: "og:title", content: "FeeScope — Cross-chain fee comparison" },
      { property: "og:description", content: "Compare transaction fees across Arc, Ethereum, Solana, Sui, Movement, and more." },
    ],
  }),
  component: HomePage,
});

const supportedChains = [
  { name: "Arc", color: "bg-blue-500" },
  { name: "Ethereum", color: "bg-indigo-500" },
  { name: "Solana", color: "bg-emerald-500" },
  { name: "Sui", color: "bg-cyan-500" },
  { name: "Movement", color: "bg-slate-900" },
  { name: "Base", color: "bg-blue-600" },
];

const features = [
  {
    icon: BarChart3,
    title: "Side-by-side fee comparison",
    description: "Compare gas, swap, and bridge fees across leading L1 and L2 networks in one view.",
  },
  {
    icon: Globe,
    title: "Public transaction explorer",
    description: "Search transactions by hash, chain, or address without signing in.",
  },
  {
    icon: Wallet,
    title: "Personal history",
    description: "Connect a wallet to label, save, and analyze your own cross-chain activity.",
  },
  {
    icon: Shield,
    title: "Institutional-grade data",
    description: "Clean, accurate estimates built for traders, builders, and analysts.",
  },
];

function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background to-muted/30 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Compare fees across every chain that matters.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            FeeScope is the clean, institutional-grade fee comparator for Arc, Ethereum, Solana, Sui, Movement, and more. Search public transactions or connect your wallet to build your own fee dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/compare">
                Compare fees
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/transactions">Explore transactions</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-3">
          {supportedChains.map((chain) => (
            <div
              key={chain.name}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm"
            >
              <span className={`h-2 w-2 rounded-full ${chain.color}`} />
              <span className="text-sm font-medium text-foreground">{chain.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Built for clarity</h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to understand and optimize on-chain costs.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ready to optimize your next transaction?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sign up for free to save comparisons, label transactions, and build your personal fee dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/auth">Get started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
