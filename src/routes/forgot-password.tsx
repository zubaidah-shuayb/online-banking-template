import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard, authInput } from "@/components/velora/auth-card";
import { btn } from "@/components/velora/ui";

const TITLE = "Reset your password — velora Bank";
const DESCRIPTION = "Request a secure password reset link for your velora Bank account.";

export const Route = createFileRoute("/forgot-password")({
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
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setSent(true);
      toast.success("Password reset link sent.");
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      description="We'll email you a secure link to choose a new password."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-border bg-surface/50 p-5 text-sm text-muted-foreground">
          If an account exists for <span className="text-foreground">{email}</span>, a reset link is on its
          way. The link opens the velora reset page.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            className={authInput}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={busy} className={btn({ size: "lg" }) + " w-full"}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </button>
        </form>
      )}
    </AuthCard>
  );
}
