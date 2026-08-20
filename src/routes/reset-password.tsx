import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard, authInput, PasswordInput } from "@/components/velora/auth-card";
import { btn } from "@/components/velora/ui";

const TITLE = "Choose a new password — VELORA Bank";
const DESCRIPTION = "Set a new password for your VELORA Bank account.";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
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
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    // Supabase parses the recovery hash and emits PASSWORD_RECOVERY / a session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick something strong — at least 6 characters."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!ready ? (
        <div className="rounded-2xl border border-border bg-surface/50 p-5 text-sm text-muted-foreground">
          Open this page from the reset link in your email. If you landed here directly, request a new link
          on the{" "}
          <Link to="/forgot-password" className="text-primary hover:underline">
            forgot password
          </Link>{" "}
          page.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="New password"
            autoComplete="new-password"
          />
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          <button type="submit" disabled={busy} className={btn({ size: "lg" }) + " w-full"}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Update password
          </button>
        </form>
      )}
    </AuthCard>
  );
}
