import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell, adminInput } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useAccounts, useProfiles, useTransactions } from "@/lib/admin-data";
import { formatMoney } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/reports")({
  head: () => ({
    meta: [
      { title: "Reports — VELORA Bank admin" },
      { name: "description", content: "Portfolio, currency and transaction reporting for VELORA Bank." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reports — VELORA Bank admin" },
      { property: "og:description", content: "VELORA Bank reporting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminReports,
});

function AdminReports() {
  const accounts = useAccounts().data ?? [];
  const profiles = useProfiles().data ?? [];
  const allTxns = useTransactions(1000).data ?? [];
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const txns = allTxns.filter((t) => {
    const at = new Date(t.created_at).getTime();
    if (from && at < new Date(from).getTime()) return false;
    if (to && at > new Date(to).getTime() + 86_400_000 - 1) return false;
    return true;
  });

  const byCurrency = accounts.reduce<Record<string, { total: number; count: number }>>((acc, a) => {
    const e = (acc[a.currency_code] ??= { total: 0, count: 0 });
    e.total += Number(a.balance);
    e.count += 1;
    return acc;
  }, {});

  const byType = txns.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + 1;
    return acc;
  }, {});

  function exportCsv() {
    const lines = [
      "currency,accounts,total_balance",
      ...Object.entries(byCurrency).map(([c, v]) => `${c},${v.count},${v.total.toFixed(2)}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "VELORA-balance-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTransactionsCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      "reference,date,type,status,amount,currency,counterparty,description",
      ...txns.map((t) =>
        [t.reference, t.created_at, t.type, t.status, t.amount, t.currency_code, t.counterparty_name, t.description]
          .map(esc)
          .join(","),
      ),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "VELORA-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="Reports" subtitle="Aggregated view of the bank.">
      <Panel className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">
            From
            <input type="date" className={adminInput + " mt-1"} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <input type="date" className={adminInput + " mt-1"} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button
            className={btn({ variant: "ghost", size: "sm" })}
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Reset
          </button>
          <button className={btn({ size: "sm" })} onClick={exportTransactionsCsv}>
            Export transactions CSV
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Customers</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{profiles.length}</p>
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Accounts</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{accounts.length}</p>
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Transactions</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{txns.length}</p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Balances by currency</h2>
            <button className={btn({ variant: "ghost", size: "sm" })} onClick={exportCsv}>
              Export CSV
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(byCurrency).map(([code, v]) => (
              <div key={code} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {code} · {v.count} account{v.count === 1 ? "" : "s"}
                </span>
                <span className="tabular-nums">{formatMoney(v.total, code)}</span>
              </div>
            ))}
            {!Object.keys(byCurrency).length && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-base font-semibold">Transactions by type</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{type}</span>
                <span className="tabular-nums">{count}</span>
              </div>
            ))}
            {!Object.keys(byType).length && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
