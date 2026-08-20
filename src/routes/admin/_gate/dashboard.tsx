import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { useAccounts, useProfiles, useTransactions, useActivityLogs } from "@/lib/admin-data";
import { formatDate, formatMoney } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — VELORA Bank" },
      { name: "description", content: "VELORA administrator overview of customers, accounts and activity." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin dashboard — VELORA Bank" },
      { property: "og:description", content: "VELORA administrator overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const profiles = useProfiles();
  const accounts = useAccounts();
  const txns = useTransactions(10);
  const logs = useActivityLogs(6);

  const total = (accounts.data ?? []).reduce((s, a) => s + Number(a.balance), 0);

  const stats = [
    { label: "Customers", value: String((profiles.data ?? []).length), to: "/admin/users" as const },
    { label: "Accounts", value: String((accounts.data ?? []).length), to: "/admin/balances" as const },
    { label: "Total balance (mixed)", value: formatMoney(total), to: "/admin/reports" as const },
    { label: "Recent transactions", value: String((txns.data ?? []).length), to: "/admin/transactions" as const },
  ];

  return (
    <AdminShell title="Admin dashboard" subtitle="Live snapshot of VELORA Bank.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Panel className="h-full transition-colors hover:border-primary/50">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</p>
            </Panel>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="text-base font-semibold">Latest transactions</h2>
          <div className="mt-4 space-y-3">
            {(txns.data ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{t.description}</span>
                <span className="shrink-0 tabular-nums">{formatMoney(Number(t.amount), t.currency_code)}</span>
              </div>
            ))}
            {!(txns.data ?? []).length && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-base font-semibold">Recent admin activity</h2>
          <div className="mt-4 space-y-3">
            {(logs.data ?? []).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{l.action}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
              </div>
            ))}
            {!(logs.data ?? []).length && <p className="text-sm text-muted-foreground">No activity recorded.</p>}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
