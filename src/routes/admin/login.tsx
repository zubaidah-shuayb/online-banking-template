import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthCard, authInput, PasswordInput } from "@/components/velora/auth-card";
import { btn } from "@/components/velora/ui";

const TITLE = "Administrator sign in — VELORA Bank";
const DESCRIPTION = "Secure sign-in for VELORA Bank administrators operating the control centre.";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDenied(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (!roles?.some((r: { role: string }) => r.role === "admin")) {
        await supabase.auth.signOut();
        setDenied(true);
        toast.error("This account is not an administrator.");
        return;
      }

      toast.success("Welcome to the VELORA admin portal.");
      void navigate({ to: "/admin/dashboard", replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      back={false}
      badge="Restricted"
      title="Administrator sign in"
      description="VELORA staff only. Customer credentials will not be accepted here."
     
    >
      <form onSubmit={submit} className="space-y-3">
        <input
          className={authInput}
          type="email"
          placeholder="Administrator email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <PasswordInput
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
        />
        {denied && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            Access denied — that account does not hold the Administrator role.
          </p>
        )}
        <button type="submit" disabled={busy} className={btn({ size: "lg" }) + " w-full"}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Sign in to admin portal
        </button>
      </form>
    </AuthCard>
  );
}
