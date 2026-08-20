import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { useTransactions } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — VELORA Bank admin" },
      { name: "description", content: "Review every transaction across VELORA customers." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Transactions — VELORA Bank admin" },
      { property: "og:description", content: "Review customer transactions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminTransactions,
});

function AdminTransactions() {
  const txns = useTransactions(300);
  const [q, setQ] = useState("");

  const rows = (txns.data ?? []).filter((t) =>
    `${t.reference} ${t.description} ${t.counterparty_name ?? ""} ${t.type}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <AdminShell title="Transactions" subtitle="All money movements, newest first.">
      <Panel className="overflow-x-auto">
        <input
          className="mb-4 w-full max-w-sm rounded-2xl border border-border bg-surface/50 px-4 py-2.5 text-sm outline-none focus:border-primary/60"
          placeholder="Search reference, description, counterparty…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="py-3 font-medium">When</th>
              <th className="py-3 font-medium">Reference</th>
              <th className="py-3 font-medium">Description</th>
              <th className="py-3 font-medium">Type</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                <td className="py-3 font-mono text-xs">{t.reference}</td>
                <td className="py-3">{t.description}</td>
                <td className="py-3 capitalize text-muted-foreground">{t.type}</td>
                <td className="py-3 capitalize text-muted-foreground">{t.status}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(Number(t.amount), t.currency_code)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AdminShell>
  );
}
