import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/velora/client";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useAccounts, useProfiles, useUserRoles, logAdminAction } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/users")({
  head: () => ({
    meta: [
      { title: "Users — VELORA Bank admin" },
      { name: "description", content: "Manage VELORA customers, KYC status and account freezes." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Users — VELORA Bank admin" },
      { property: "og:description", content: "Manage VELORA customers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminUsers,
});

function AdminUsers() {
  const profiles = useProfiles();
  const accounts = useAccounts();
  const roles = useUserRoles();
  const qc = useQueryClient();

  const setRole = useMutation({
    mutationFn: async ({ id, grant }: { id: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role", {
        _user_id: id,
        _role: "admin",
        _grant: grant,
      });
      if (error) throw error;
      await logAdminAction(grant ? "grant_admin" : "revoke_admin", "profile", id);
    },
    onSuccess: () => {
      toast.success("Role updated");
      void qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Role update failed"),
  });

  const setKyc = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("id", id);
      if (error) throw error;
      await logAdminAction("update_kyc", "profile", id, { status });
    },
    onSuccess: () => {
      toast.success("KYC status updated");
      void qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const freezeUser = useMutation({
    mutationFn: async ({ id, frozen }: { id: string; frozen: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_frozen: frozen }).eq("id", id);
      if (error) throw error;
      const { error: e2 } = await supabase.from("accounts").update({ is_frozen: frozen }).eq("user_id", id);
      if (e2) throw e2;
      await logAdminAction(frozen ? "freeze_user" : "unfreeze_user", "profile", id);
    },
    onSuccess: () => {
      toast.success("Customer updated");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <AdminShell title="Users" subtitle="Every customer registered with VELORA Bank.">
      <div className="space-y-4">
        {(profiles.data ?? []).map((p) => {
          const owned = (accounts.data ?? []).filter((a) => a.user_id === p.id);
          const isAdmin = (roles.data ?? []).some((r) => r.user_id === p.id && r.role === "admin");
          return (
            <Panel key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.full_name || "Unnamed customer"}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/70">
                    Joined {formatDate(p.created_at)} · {p.country || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {isAdmin ? "Administrator" : "Customer"}
                    </span>
                    {p.is_frozen && (
                      <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-destructive">
                        Suspended
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    value={p.kyc_status}
                    onChange={(e) => setKyc.mutate({ id: p.id, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    className={btn({ variant: "ghost", size: "sm" })}
                    onClick={() => setRole.mutate({ id: p.id, grant: !isAdmin })}
                  >
                    {isAdmin ? "Revoke admin" : "Make admin"}
                  </button>
                  <button
                    className={btn({ variant: "ghost", size: "sm" })}
                    onClick={() => freezeUser.mutate({ id: p.id, frozen: !p.is_frozen })}
                  >
                    {p.is_frozen ? "Reactivate customer" : "Suspend customer"}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {owned.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-border/60 bg-surface/40 p-3 text-sm">
                    <p className="font-medium">
                      {a.label} · {formatMoney(Number(a.balance), a.currency_code)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{a.account_number}</p>
                  </div>
                ))}
                {!owned.length && <p className="text-sm text-muted-foreground">No accounts.</p>}
              </div>
            </Panel>
          );
        })}
        {!(profiles.data ?? []).length && (
          <Panel className="text-sm text-muted-foreground">No customers yet.</Panel>
        )}
      </div>
    </AdminShell>
  );
}
