import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

const footerLinks = [
  { label: "Compare", to: "/compare" },
  { label: "Transactions", to: "/transactions" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <span className="text-base font-semibold tracking-tight">FeeScope</span>
          </Link>

          <nav className="flex flex-wrap gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} FeeScope. Compare fees across Arc, Ethereum, Solana, and more.</span>
          <a
            href="https://www.arc.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Built on Arc
          </a>
        </div>
      </div>
    </footer>
  );
}
