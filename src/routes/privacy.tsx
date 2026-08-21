import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — FeeScope" },
      { name: "description", content: "FeeScope privacy policy and data handling practices." },
      { property: "og:title", content: "Privacy Policy — FeeScope" },
      { property: "og:description", content: "FeeScope privacy policy and data handling practices." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">
        FeeScope is committed to protecting your privacy. This policy explains how we handle the data you provide when using our app.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Data we collect</h2>
      <p className="mt-2 text-muted-foreground">
        When you sign up, we collect your email address and account identifiers through our secure authentication provider. If you choose to connect a wallet, we store only the address and labels you provide.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">How we use data</h2>
      <p className="mt-2 text-muted-foreground">
        We use your data to provide personalized features such as saved comparisons, transaction history, and account preferences. We do not sell your data to third parties.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Public data</h2>
      <p className="mt-2 text-muted-foreground">
        FeeScope aggregates publicly available blockchain data. Public transaction searches do not require an account.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-foreground">Contact</h2>
      <p className="mt-2 text-muted-foreground">
        For privacy questions, reach out through the contact details in the app settings.
      </p>
    </div>
  );
}
