import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/velora/client";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useAccounts, useProfiles, logAdminAction } from "@/lib/admin-data";
import { formatMoney, type Account } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/balances")({
  head: () => ({
    meta: [
      { title: "Balances — VELORA Bank admin" },
      { name: "description", content: "Credit, debit and freeze VELORA account balances." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Balances — VELORA Bank admin" },
      { property: "og:description", content: "Manage customer balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminBalances,
});

function AdminBalances() {
  const accounts = useAccounts();
  const profiles = useProfiles();
  const qc = useQueryClient();

  const adjust = useMutation({
    mutationFn: async ({ accountId, amount }: { accountId: string; amount: number }) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Administrator session expired");
      const { data, error } = await supabase.rpc("admin_adjust_balance", {
        _account_id: accountId,
        _amount: amount,
        _description: "Administrative adjustment",
      });
      if (error) {
        console.error("[admin] Balance adjustment failed", { accountId, amount, error });
        throw new Error(`Balance adjustment failed: ${error.message}`);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Balance updated");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Adjustment failed"),
  });

  const toggleFreeze = useMutation({
    mutationFn: async ({ id, frozen }: { id: string; frozen: boolean }) => {
      const { error } = await supabase.from("accounts").update({ is_frozen: frozen }).eq("id", id);
      if (error) throw error;
      await logAdminAction(frozen ? "freeze_account" : "unfreeze_account", "account", id);
    },
    onSuccess: () => {
      toast.success("Account updated");
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const nameFor = (userId: string) =>
    (profiles.data ?? []).find((p) => p.id === userId)?.full_name || "Customer";

  return (
    <AdminShell title="Balances" subtitle="Credit or debit any customer account instantly.">
      <div className="space-y-3">
        {(accounts.data ?? []).map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            owner={nameFor(a.user_id)}
            onAdjust={(amount) => adjust.mutate({ accountId: a.id, amount })}
            onFreeze={() => toggleFreeze.mutate({ id: a.id, frozen: !a.is_frozen })}
          />
        ))}
        {!(accounts.data ?? []).length && (
          <Panel className="text-sm text-muted-foreground">No accounts yet.</Panel>
        )}
      </div>
    </AdminShell>
  );
}

function AccountRow({
  account,
  owner,
  onAdjust,
  onFreeze,
}: {
  account: Account;
  owner: string;
  onAdjust: (amount: number) => void;
  onFreeze: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <Panel className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {owner} · {account.label} · {formatMoney(Number(account.balance), account.currency_code)}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {account.account_number}
          {account.is_frozen && " · frozen"}
        </p>
      </div>
      <input
        className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        type="number"
        step="0.01"
        placeholder="±amount"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        className={btn({ size: "sm" })}
        onClick={() => {
          const n = Number(value);
          if (!n) return toast.error("Enter an amount");
          onAdjust(n);
          setValue("");
        }}
      >
        Apply
      </button>
      <button className={btn({ variant: "ghost", size: "sm" })} onClick={onFreeze}>
        {account.is_frozen ? "Unfreeze" : "Freeze"}
      </button>
    </Panel>
  );
}
