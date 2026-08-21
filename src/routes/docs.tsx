import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — FeeScope" },
      { name: "description", content: "Learn how FeeScope compares fees across chains and how to use the transaction explorer." },
      { property: "og:title", content: "Documentation — FeeScope" },
      { property: "og:description", content: "Learn how FeeScope compares fees across chains and how to use the transaction explorer." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documentation</h1>
      <p className="mt-4 text-muted-foreground">
        FeeScope is a multi-chain fee comparator and transaction explorer. This page is a placeholder for the full documentation that will cover:
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>How fee estimates are sourced and normalized</li>
        <li>Supported chains and network coverage</li>
        <li>Connecting wallets and personal transaction history</li>
        <li>Saving and sharing fee comparisons</li>
        <li>API access for builders and integrations</li>
      </ul>
      <p className="mt-6 text-muted-foreground">
        Full docs will be added in a later milestone. In the meantime, reach out through the app feedback channels.
      </p>
    </div>
  );
}
