import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — FeeScope" },
      { name: "description", content: "FeeScope terms of service and acceptable use policy." },
      { property: "og:title", content: "Terms of Service — FeeScope" },
      { property: "og:description", content: "FeeScope terms of service and acceptable use policy." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
      <p className="mt-4 text-muted-foreground">
        By using FeeScope, you agree to these terms. Please read them carefully.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Use of the service</h2>
      <p className="mt-2 text-muted-foreground">
        FeeScope provides fee estimates and transaction exploration for educational and analytical purposes. Estimates are not guaranteed and should not be the sole basis for financial decisions.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Acceptable use</h2>
      <p className="mt-2 text-muted-foreground">
        You agree not to use FeeScope for unlawful activities, to abuse our infrastructure, or to attempt to access data or accounts you do not own.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Disclaimer</h2>
      <p className="mt-2 text-muted-foreground">
        FeeScope is provided "as is" without warranties of any kind. Always verify fees directly with the relevant network or protocol before signing a transaction.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Changes</h2>
      <p className="mt-2 text-muted-foreground">
        We may update these terms from time to time. Continued use of FeeScope after changes constitutes acceptance.
      </p>
    </div>
  );
}
