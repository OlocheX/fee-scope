import { createFileRoute, useSearch, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Mail, Loader2, Chrome } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — FeeScope" },
      { name: "description", content: "Sign in to FeeScope to save fee comparisons and view your transaction history." },
      { property: "og:title", content: "Sign in — FeeScope" },
      { property: "og:description", content: "Sign in to FeeScope to save fee comparisons and view your transaction history." },
    ],
  }),
  component: AuthPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
});

function AuthPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const search = useSearch({ from: "/auth" }) as { next?: string };

  // Preserve the intended destination passed via the consent flow or other routes.
  const next = search.next || "/dashboard";

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        window.location.href = next;
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [next]);

  const [mode, setMode] = useState<"form" | "verify" | "forgot">("form");
  const [code, setCode] = useState("");
  const [failed, setFailed] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resendCode = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { toast.error(error.message); return; }
    setCooldown(60);
    toast.success("Email sent again", { description: "Check your inbox and spam folder." });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email confirmed");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reset link sent", { description: "Check your inbox and spam folder." });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (activeTab === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords don't match");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.user && data.user.identities?.length === 0) {
          toast.error("This email already has an account", { description: "Sign in, or use Forgot password." });
          setActiveTab("signin");
          return;
        }
        setMode("verify");
        setCooldown(60);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("not confirmed")) {
            toast.error("Your email isn't confirmed yet");
            setMode("verify");
            return;
          }
          setFailed(true);
          toast.error("Wrong email or password", {
            description: "If you signed up with Google, use Continue with Google or reset your password.",
          });
          return;
        }
        toast.success("Signed in");
        window.location.href = next;
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (mode !== "form") {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          {mode === "verify" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Confirm your email</h1>
              <p className="text-sm text-muted-foreground">
                We emailed {email}. Click the link in the email, or enter the code if one is included. Check your spam folder too.
              </p>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={8} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={cooldown > 0} onClick={resendCode}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode("form")}>
                Back
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h1>
              <p className="text-sm text-muted-foreground">Enter your email and we'll send you a link to set a new password.</p>
              <div className="space-y-2">
                <Label htmlFor="femail">Email</Label>
                <Input id="femail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send reset link
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode("form")}>
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: {
          prompt: "select_account",
        },
      });

      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        return;
      }

      if (result.redirected) {
        // Browser will redirect — nothing more to do here.
        return;
      }

      // Tokens returned directly — session already set by the helper.
      window.location.href = next;
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to FeeScope</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to save comparisons, track your history, and unlock personalized fee insights.
          </p>
        </div>

        <div className="mt-8">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  minLength={8}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className={failed ? "text-sm font-medium text-primary underline" : "text-sm text-muted-foreground hover:underline"}
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
