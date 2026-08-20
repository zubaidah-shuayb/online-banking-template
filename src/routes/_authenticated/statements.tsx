import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Receipt, FileText } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { AppShell, Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { formatDate, formatMoney, txnDescription, txnLabel, type Account, type Transaction } from "@/integrations/velora/types";

export const Route = createFileRoute("/_authenticated/statements")({
  head: () => ({
    meta: [
      { title: "Statements & receipts — VELORA Bank" },
      { name: "description", content: "Filter your VELORA transaction history by account and period, then download statements and receipts." },
      { property: "og:title", content: "Statements & receipts — VELORA Bank" },
      { property: "og:description", content: "Download statements and per-transaction receipts from VELORA Bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Statements,
});

function download(name: string, content: string, mime = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function isoDaysAgo(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function Statements() {
  const [accountId, setAccountId] = useState("all");
  const [months, setMonths] = useState(3);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const start = fromDate || isoDaysAgo(months);
  const end = toDate || "";

  const transactions = useQuery({
    queryKey: ["statement-transactions", accountId, start, end],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*")
        .gte("created_at", `${start}T00:00:00.000Z`)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (end) q = q.lte("created_at", `${end}T23:59:59.999Z`);
      if (accountId !== "all") q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });

  const rows = useMemo(() => transactions.data ?? [], [transactions.data]);


  const exportCsv = () => {
    const header = "Reference,Date,Description,Counterparty,Type,Status,Amount,Currency,Balance after";
    const body = rows
      .map((t) =>
        [
          t.reference,
          new Date(t.created_at).toISOString(),
          `"${txnDescription(t)}"`,
          `"${t.counterparty_name ?? ""}"`,
          txnLabel(t.type),
          t.status,
          t.amount,
          t.currency_code,
          t.balance_after ?? "",
        ].join(","),
      )
      .join("\n");
    download(`velora-statement-${Date.now()}.csv`, `${header}\n${body}`);
  };

  const receipt = (t: Transaction) =>
    download(
      `velora-receipt-${t.reference}.txt`,
      [
        "VELORA BANK — TRANSACTION RECEIPT",
        "================================",
        `Reference     : ${t.reference}`,
        `Date          : ${new Date(t.created_at).toLocaleString()}`,
        `Type          : ${txnLabel(t.type)}`,
        `Status        : ${t.status}`,
        `Counterparty  : ${t.counterparty_name ?? "—"} ${t.counterparty_number ?? ""}`,
        `Description   : ${txnDescription(t)}`,
        `Amount        : ${formatMoney(Number(t.amount), t.currency_code)}`,
        `Balance after : ${t.balance_after ?? "—"}`,
        "",
        "VELORA Bank · This receipt was generated electronically and is valid without signature.",
      ].join("\n"),
      "text/plain",
    );

  return (
    <AppShell title="Statements & receipts" subtitle="Export your transaction history at any time.">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Account</label>
              <select
                className="w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none focus:border-primary/60"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="all">All accounts</option>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.account_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Period</label>
              <select
                className="w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none focus:border-primary/60"
                value={months}
                disabled={Boolean(fromDate)}
                onChange={(e) => setMonths(Number(e.target.value))}
              >
                <option value={1}>Last month</option>
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">From</label>
              <input
                type="date"
                className="w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none focus:border-primary/60"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">To</label>
              <input
                type="date"
                className="w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none focus:border-primary/60"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <button onClick={exportCsv} className={btn({ size: "md" })}>
            <Download className="size-4" /> Export statement
          </button>
        </div>
      </Panel>

      <Panel className="mt-6 overflow-x-auto">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 className="text-base font-semibold">{rows.length} transactions</h2>
        </div>
        <table className="mt-4 w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="py-3 font-medium">Reference</th>
              <th className="py-3 font-medium">Date</th>
              <th className="py-3 font-medium">Description</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 text-right font-medium">Amount</th>
              <th className="py-3 text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="py-3 font-mono text-xs">{t.reference}</td>
                <td className="py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                <td className="py-3">{txnDescription(t) || t.counterparty_name}</td>
                <td className="py-3">
                  <span className="rounded-full border border-border px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                    {t.status}
                  </span>
                </td>
                <td className="py-3 text-right font-semibold tabular-nums">
                  {formatMoney(Number(t.amount), t.currency_code)}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => receipt(t)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Receipt className="size-3.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No transactions in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
