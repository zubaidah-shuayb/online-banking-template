import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard, authInput, PasswordInput } from "@/components/velora/auth-card";
import { btn } from "@/components/velora/ui";

const TITLE = "Sign in — velora Bank";
const DESCRIPTION = "Sign in to your velora Bank dashboard and manage your accounts.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;
      toast.success("Welcome back to velora.");
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your velora banking dashboard."
      footer={
        <>
          New to velora?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Open an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <input
          className={authInput}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <PasswordInput
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
        />
        <button type="submit" disabled={busy} className={btn({ size: "lg" }) + " w-full"}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
        <Link
          to="/forgot-password"
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Forgot your password?
        </Link>
      </form>
    </AuthCard>
  );
}
