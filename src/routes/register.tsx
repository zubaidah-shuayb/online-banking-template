import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard, authInput, PasswordInput } from "@/components/velora/auth-card";
import { btn } from "@/components/velora/ui";

const TITLE = "Open an account — VELORA Bank";
const DESCRIPTION =
  "Open a free VELORA Bank account with a multi-currency wallet in under a minute.";

export const Route = createFileRoute("/register")({
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
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ fullName: "", country: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin + "/login",
          data: { full_name: form.fullName, country: form.country },
        },
      });
      if (error) throw error;
      if (!data.session) {
        setSent(true);
        toast.success("Account created successfully", {
          description: "Verify your email, then head to sign in to access your dashboard.",
        });
      } else {
        toast.success("Account created successfully", {
          description: "Your VELORA account is ready — please sign in to continue.",
        });
        await supabase.auth.signOut();
        setSent(true);
        void navigate({ to: "/login", replace: true });
      }
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Open your account"
      description="Create your account with a multi-currency wallet in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-border bg-surface/50 p-5 text-sm text-muted-foreground">
          <MailCheck className="mb-3 size-5 text-primary" />
          We sent a verification link to <span className="text-foreground">{form.email}</span>. Click it to
          activate your VELORA account, then{" "}
          <Link to="/login" className="text-primary hover:underline">
            sign in
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            className={authInput}
            placeholder="Full name"
            autoComplete="name"
            value={form.fullName}
            onChange={set("fullName")}
            required
          />
          <input
            className={authInput}
            placeholder="Country"
            autoComplete="country-name"
            value={form.country}
            onChange={set("country")}
          />
          <input
            className={authInput}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            required
          />
          <PasswordInput
            value={form.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
            placeholder="Password (min. 6 characters)"
            autoComplete="new-password"
          />
          <button type="submit" disabled={busy} className={btn({ size: "lg" }) + " w-full"}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Create account
          </button>
        </form>
      )}
    </AuthCard>
  );
}
