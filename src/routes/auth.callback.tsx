import { createFileRoute, useSearch, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Completing sign-in — FeeScope" },
      { name: "description", content: "Completing your FeeScope sign-in." },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const search = useSearch({ from: "/auth/callback" }) as { next?: string };
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    const finish = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          setStatus("No session found. Please sign in again.");
          setTimeout(() => redirect({ to: "/auth" }), 1500);
          return;
        }

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setStatus("Could not verify your account. Please sign in again.");
          setTimeout(() => redirect({ to: "/auth" }), 1500);
          return;
        }

        const next = typeof search.next === "string" && search.next.startsWith("/") ? search.next : "/dashboard";
        window.location.href = next;
      } catch (err) {
        setStatus("Something went wrong. Please sign in again.");
        setTimeout(() => redirect({ to: "/auth" }), 1500);
      }
    };

    finish();
  }, [search.next]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">{status}</p>
      </div>
    </div>
  );
}
