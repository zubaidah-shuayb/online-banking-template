import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useAccounts, useProfiles } from "@/lib/admin-data";
import { formatMoney, type Transaction } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/new-transaction")({
  head: () => ({
    meta: [
      { title: "New transaction — VELORA Bank admin" },
      { name: "description", content: "Post a transaction to any VELORA customer account with full receipt details." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "New transaction — VELORA Bank admin" },
      { property: "og:description", content: "Post customer transactions with full receipt details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewTransaction,
});

const field =
  "w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/60";
const label = "mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground";

const TYPES = ["deposit", "withdrawal", "transfer", "fee", "interest"] as const;
const STATUSES = ["completed", "pending", "failed", "reversed"] as const;
const CATEGORIES = ["transfer", "income", "salary", "payment", "shopping", "bills", "travel", "banking"];

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function NewTransaction() {
  const accounts = useAccounts();
  const profiles = useProfiles();
  const qc = useQueryClient();
  const [last, setLast] = useState<Transaction | null>(null);

  const [form, setForm] = useState({
    accountId: "",
    type: "deposit" as (typeof TYPES)[number],
    status: "completed" as (typeof STATUSES)[number],
    amount: "",
    description: "",
    counterpartyName: "",
    counterpartyNumber: "",
    category: "transfer",
    reference: "",
    createdAt: localNow(),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const options = useMemo(() => {
    const nameFor = (userId: string) =>
      (profiles.data ?? []).find((p) => p.id === userId)?.full_name || "Customer";
    return (accounts.data ?? []).map((a) => ({
      id: a.id,
      text: `${nameFor(a.user_id)} · ${a.label} · ${a.account_number} · ${formatMoney(Number(a.balance), a.currency_code)}`,
    }));
  }, [accounts.data, profiles.data]);

  const post = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!form.accountId) throw new Error("Select a customer account");
      if (!amount) throw new Error("Enter an amount");
      if (!form.description.trim()) throw new Error("Enter a description for the receipt");

      const { data, error } = await supabase.rpc("admin_create_transaction", {
        _account_id: form.accountId,
        _type: form.type,
        _amount: amount,
        _description: form.description.trim(),
        _counterparty_name: form.counterpartyName.trim() || null,
        _counterparty_number: form.counterpartyNumber.trim() || null,
        _category: form.category,
        _status: form.status,
        _created_at: new Date(form.createdAt).toISOString(),
        _reference: form.reference.trim() || null,
      });
      if (error) throw new Error(error.message);
      return data as Transaction;
    },
    onSuccess: (txn) => {
      setLast(txn);
      toast.success("Transaction posted", { description: `Reference ${txn?.reference ?? ""}` });
      setForm((f) => ({
        ...f,
        amount: "",
        description: "",
        counterpartyName: "",
        counterpartyNumber: "",
        reference: "",
        createdAt: localNow(),
      }));
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post transaction"),
  });

  return (
    <AdminShell
      title="New transaction"
      subtitle="Post a transaction to a customer account — it appears instantly in their statement and receipts."
    >
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              post.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <label className={label}>Customer account</label>
              <select
                className={field}
                value={form.accountId}
                onChange={(e) => set("accountId", e.target.value)}
              >
                <option value="">Select an account…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.text}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Type</label>
              <select className={field} value={form.type} onChange={(e) => set("type", e.target.value as never)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "deposit" ? "Credit (deposit)" : t === "withdrawal" ? "Debit (withdrawal)" : t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Amount</label>
              <input
                className={field}
                type="number"
                step="0.01"
                placeholder="1500.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Status</label>
              <select className={field} value={form.status} onChange={(e) => set("status", e.target.value as never)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Category</label>
              <select className={field} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={label}>Description (shows on the receipt)</label>
              <input
                className={field}
                placeholder="Salary payment — July"
                maxLength={140}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Counterparty name</label>
              <input
                className={field}
                placeholder="Meridian Holdings Ltd"
                maxLength={100}
                value={form.counterpartyName}
                onChange={(e) => set("counterpartyName", e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Counterparty account</label>
              <input
                className={field}
                placeholder="4021 0000 0000"
                maxLength={40}
                value={form.counterpartyNumber}
                onChange={(e) => set("counterpartyNumber", e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Value date &amp; time</label>
              <input
                className={field}
                type="datetime-local"
                value={form.createdAt}
                onChange={(e) => set("createdAt", e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Reference (optional)</label>
              <input
                className={field}
                placeholder="Auto-generated if blank"
                maxLength={40}
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <button type="submit" disabled={post.isPending} className={btn({ size: "lg" }) + " w-full sm:w-auto"}>
                {post.isPending ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
                Post transaction
              </button>
              <p className="mt-3 text-xs text-muted-foreground">
                Completed transactions update the account balance immediately. Pending, failed and reversed
                transactions are recorded without moving money.
              </p>
            </div>
          </form>
        </Panel>

        <Panel>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last posted receipt</p>
          {last ? (
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ["Reference", last.reference],
                ["Date", new Date(last.created_at).toLocaleString()],
                ["Type", last.type],
                ["Status", last.status],
                ["Counterparty", last.counterparty_name ?? "—"],
                ["Description", last.description],
                ["Amount", formatMoney(Number(last.amount), last.currency_code)],
                ["Balance after", last.balance_after == null ? "—" : formatMoney(Number(last.balance_after), last.currency_code)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Post a transaction and its full receipt detail appears here.
            </p>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}
