import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/velora/client";
import { AdminShell, adminInput } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useCurrencies, logAdminAction } from "@/lib/admin-data";
import type { Currency } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/currencies")({
  head: () => ({
    meta: [
      { title: "Currencies — VELORA Bank admin" },
      { name: "description", content: "Manage VELORA currencies and exchange rates." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Currencies — VELORA Bank admin" },
      { property: "og:description", content: "Manage currencies and rates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminCurrencies,
});

function AdminCurrencies() {
  const rows = useCurrencies().data ?? [];
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", symbol: "", rate_to_usd: "1" });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("currencies").upsert({
        code: form.code.toUpperCase(),
        name: form.name,
        symbol: form.symbol,
        rate_to_usd: Number(form.rate_to_usd),
      });
      if (error) throw error;
      await logAdminAction("save_currency", "currency", undefined, { code: form.code.toUpperCase() });
    },
    onSuccess: () => {
      toast.success("Currency saved");
      setForm({ code: "", name: "", symbol: "", rate_to_usd: "1" });
      void qc.invalidateQueries({ queryKey: ["admin-currencies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const toggle = useMutation({
    mutationFn: async (c: Currency) => {
      const { error } = await supabase.from("currencies").update({ is_active: !c.is_active }).eq("code", c.code);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-currencies"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("Rate provider unavailable");
      const json = (await res.json()) as { rates?: Record<string, number> };
      const rates = json.rates ?? {};
      const updates = rows
        .filter((c) => typeof rates[c.code] === "number")
        .map((c) => ({ code: c.code, rate_to_usd: rates[c.code] as number }));
      if (!updates.length) throw new Error("No matching rates returned");
      for (const u of updates) {
        const { error } = await supabase
          .from("currencies")
          .update({ rate_to_usd: u.rate_to_usd })
          .eq("code", u.code);
        if (error) throw error;
      }
      await logAdminAction("refresh_rates", "currency", undefined, { count: updates.length });
      return updates.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} rate${count === 1 ? "" : "s"} refreshed`);
      void qc.invalidateQueries({ queryKey: ["admin-currencies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Refresh failed"),
  });

  return (
    <AdminShell title="Currencies" subtitle="Rates power every multi-currency transfer.">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Panel>
          <h2 className="text-base font-semibold">Add or update currency</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <input className={adminInput} placeholder="Code (USD)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <input className={adminInput} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={adminInput} placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required />
            <input className={adminInput} type="number" step="0.000001" placeholder="Rate to USD" value={form.rate_to_usd} onChange={(e) => setForm({ ...form, rate_to_usd: e.target.value })} />
            <button className={btn({ size: "md" }) + " w-full"} type="submit">
              Save currency
            </button>
          </form>
        </Panel>

        <Panel className="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Live rates</h2>
            <button
              className={btn({ variant: "ghost", size: "sm" })}
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
            >
              {refresh.isPending ? "Refreshing…" : "Auto-refresh rates"}
            </button>
          </div>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-3 font-medium">Code</th>
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Rate → USD</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((c) => (
                <tr key={c.code}>
                  <td className="py-3 font-mono">
                    {c.symbol} {c.code}
                  </td>
                  <td className="py-3">{c.name}</td>
                  <td className="py-3 tabular-nums">{c.rate_to_usd}</td>
                  <td className="py-3 text-right">
                    <button className="text-xs text-primary hover:underline" onClick={() => toggle.mutate(c)}>
                      {c.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </AdminShell>
  );
}
