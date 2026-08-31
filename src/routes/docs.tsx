import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — FeeScope" },
      {
        name: "description",
        content:
          "How FeeScope sources live gas data across 13 networks, normalizes fees to USD, and how to use the address and transaction explorer.",
      },
      { property: "og:title", content: "Documentation — FeeScope" },
      {
        property: "og:description",
        content:
          "How FeeScope sources live gas data across 13 networks, normalizes fees to USD, and how to use the address and transaction explorer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

const CHAINS: { name: string; type: string; token: string; method: string }[] = [
  { name: "Arc", type: "Layer 1 (testnet)", token: "USDC", method: "JSON-RPC eth_gasPrice" },
  { name: "Ethereum", type: "Layer 1", token: "ETH", method: "JSON-RPC eth_gasPrice" },
  { name: "Base", type: "Layer 2", token: "ETH", method: "JSON-RPC eth_gasPrice" },
  { name: "Arbitrum", type: "Layer 2", token: "ETH", method: "JSON-RPC eth_gasPrice" },
  { name: "Optimism", type: "Layer 2", token: "ETH", method: "JSON-RPC eth_gasPrice" },
  { name: "Polygon", type: "Layer 1", token: "POL", method: "JSON-RPC eth_gasPrice" },
  { name: "Avalanche", type: "Layer 1", token: "AVAX", method: "JSON-RPC eth_gasPrice" },
  { name: "BNB Chain", type: "Layer 1", token: "BNB", method: "JSON-RPC eth_gasPrice" },
  { name: "Celo", type: "Layer 2", token: "CELO", method: "JSON-RPC eth_gasPrice" },
  { name: "Solana", type: "SVM", token: "SOL", method: "getFeeForMessage / base fee" },
  { name: "Sui", type: "Move VM", token: "SUI", method: "Reference gas price" },
  { name: "Movement", type: "Move VM", token: "MOVE", method: "REST gas estimate" },
  { name: "Aptos", type: "Move VM", token: "APT", method: "REST gas estimate" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Documentation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          How FeeScope works
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          FeeScope is a multi-chain fee comparator and transaction explorer built on Arc. It reads
          gas conditions directly from public nodes, converts every result into a common USD unit,
          and lets you inspect the real fees an address has paid. Nothing on this site is an
          estimate typed in by hand — every number is fetched at request time.
        </p>
      </header>

      <nav className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">On this page</p>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            ["#coverage", "Supported networks"],
            ["#methodology", "Fee methodology"],
            ["#pricing", "USD conversion"],
            ["#explorer", "Address & tx explorer"],
            ["#compare", "Two-chain comparison"],
            ["#accounts", "Accounts & saved data"],
            ["#limits", "Limitations"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <li key={href}>
              <a className="transition-colors hover:text-foreground" href={href}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-10">
        <Section id="coverage" title="Supported networks">
          <p>
            Thirteen networks are polled on every request, spanning EVM Layer 1s and Layer 2s, the
            Solana VM, and the Move VM. Arc is queried on its public testnet endpoint, where gas is
            denominated in USDC rather than a volatile native token.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Network</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Gas token</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {CHAINS.map((c) => (
                  <tr key={c.name} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.token}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Each network is configured with a primary and a fallback RPC endpoint. If the primary
            times out, the fallback is tried before the network is marked unavailable, so a single
            provider outage never blanks the whole table.
          </p>
        </Section>

        <Section id="methodology" title="Fee methodology">
          <p>
            To make chains with very different execution models comparable, FeeScope prices one
            reference action: a <strong className="text-foreground">simple native-token transfer</strong>.
            That is the smallest meaningful unit of blockspace on every supported network.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">EVM chains</strong> — the live gas price is read
              via <code className="rounded bg-muted px-1 py-0.5 text-xs">eth_gasPrice</code> and
              multiplied by a 21,000 gas limit, the protocol cost of a plain transfer.
            </li>
            <li>
              <strong className="text-foreground">Solana</strong> — the base signature fee of 5,000
              lamports per signature is used, matching what a one-signature transfer actually pays.
            </li>
            <li>
              <strong className="text-foreground">Sui</strong> — the network&apos;s reference gas
              price is combined with the computation and storage budget of a transfer.
            </li>
            <li>
              <strong className="text-foreground">Move VM chains (Movement, Aptos)</strong> — the
              node&apos;s estimated gas unit price is multiplied by the gas units a transfer
              consumes.
            </li>
            <li>
              <strong className="text-foreground">Arc</strong> — gas is paid in USDC, so the native
              amount is already the dollar amount; no price feed is required.
            </li>
          </ul>
          <p>
            Layer 2 figures reflect the L2 execution fee reported by the sequencer. They exclude the
            L1 data-availability component, which varies with calldata size and Ethereum congestion.
          </p>
          <p>
            Results refresh automatically about once a minute, and each row shows whether it is live
            or temporarily unavailable so a stale value is never presented as current.
          </p>
        </Section>

        <Section id="pricing" title="USD conversion">
          <p>
            Native amounts are converted to USD using a public spot price feed, with a second
            independent exchange feed as a fallback when the primary is rate-limited or unreachable.
            If both fail, the native amount is still shown and the USD column reports that pricing
            is temporarily unavailable — a missing price never removes the chain from the table.
          </p>
          <p>
            Prices are spot rates at the moment of the request, not time-weighted averages, so
            comparisons made seconds apart during volatile markets can differ slightly.
          </p>
        </Section>

        <Section id="explorer" title="Address & transaction explorer">
          <p>
            The{" "}
            <Link to="/transactions" className="font-medium text-primary hover:underline">
              transactions page
            </Link>{" "}
            accepts either a wallet address or a transaction hash and detects the format
            automatically:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">0x-prefixed, 40 hex characters</strong> — an EVM
              address; queried across every supported EVM network in parallel.
            </li>
            <li>
              <strong className="text-foreground">0x-prefixed, 64 hex characters</strong> — an EVM
              transaction hash, or a Sui/Move object or account identifier.
            </li>
            <li>
              <strong className="text-foreground">Base58, 32–44 characters</strong> — a Solana
              account address or transaction signature.
            </li>
          </ul>
          <p>
            For an address, FeeScope returns the native balance per chain plus up to ten recent
            transactions with their status, method, timestamp, fee paid in native units and USD, and
            a deep link to that chain&apos;s block explorer. Chains where the address has no
            activity, or where history indexing is not yet available, are reported separately from
            genuine errors.
          </p>
          <p>
            Method labels come from the transaction input: a raw four-byte selector is shown as a
            contract call, while a transfer with no calldata is labelled as a transfer.
          </p>
        </Section>

        <Section id="compare" title="Two-chain comparison">
          <p>
            Below the search results, the comparison panel puts two networks of your choice
            side by side. For each side it shows the current live cost of a transfer, and — when
            you have searched an address — how many transactions that wallet has on that chain, the
            average fee it paid, and the cumulative total spent on fees.
          </p>
          <p>
            FeeScope then states which of the two is currently cheaper and by what multiple. Your
            selection is stored in the URL, so a comparison can be bookmarked or shared and it will
            reopen with the same two networks.
          </p>
        </Section>

        <Section id="accounts" title="Accounts & saved data">
          <p>
            Creating an account with email or Google unlocks the dashboard, where your profile and
            preferences are stored securely. Every record is protected by row-level security, so
            your data is only ever readable by your own signed-in session.
          </p>
          <p>
            Saved comparison sets, address watchlists, and private transaction labels are planned
            extensions of the same account model. FeeScope never asks for a private key or seed
            phrase, and cannot move funds.
          </p>
        </Section>

        <Section id="limits" title="Limitations">
          <ul className="list-disc space-y-2 pl-5">
            <li>Arc data comes from its public testnet, so values are indicative of mainnet, not identical.</li>
            <li>Layer 2 costs exclude the L1 data-availability portion of the total fee.</li>
            <li>A transfer is the reference action; swaps, mints, and complex contract calls cost more.</li>
            <li>Address history depends on third-party indexers and is not available on every network.</li>
            <li>Public RPC endpoints apply rate limits; a chain may briefly show as unavailable under load.</li>
          </ul>
        </Section>

        <Section id="faq" title="FAQ">
          <div className="space-y-5">
            <div>
              <p className="font-medium text-foreground">Why is one network showing as unavailable?</p>
              <p className="mt-1">
                Its public RPC endpoint or the price feed did not answer within the timeout. The
                next refresh usually restores it; no cached value is substituted in the meantime.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Why is Arc so consistently cheap?</p>
              <p className="mt-1">
                Arc charges gas in USDC at a stable, predictable rate, so its cost does not move
                with the price of a volatile gas token.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Do I need to connect a wallet?</p>
              <p className="mt-1">
                No. Every lookup and comparison works from a pasted address. Connecting is only
                about convenience, and read access only.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Can I compare a chain that is not listed?</p>
              <p className="mt-1">
                Networks are added on request. Any chain exposing a public RPC endpoint can be
                integrated into the same methodology.
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6">
        <p className="text-sm font-medium text-foreground">Ready to try it?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Open the live fee table or look up an address across every supported network.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
          <Link
            to="/compare"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
          >
            Compare fees
          </Link>
          <Link
            to="/transactions"
            className="rounded-md border border-border px-4 py-2 text-foreground transition-colors hover:bg-muted"
          >
            Explore transactions
          </Link>
        </div>
      </div>
    </div>
  );
}
