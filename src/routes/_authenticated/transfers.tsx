import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, Pencil, Send, Star, Trash2, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { AppShell, Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useAuth } from "@/lib/auth";
import { useScheduledTransfers } from "@/lib/dashboard-data";
import {
  formatMoney,
  type Account,
  type Beneficiary,
} from "@/integrations/velora/types";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "Send money — VELORA Bank" },
      { name: "description", content: "Move money instantly, save beneficiaries and schedule recurring VELORA transfers." },
      { property: "og:title", content: "Send money — VELORA Bank" },
      { property: "og:description", content: "Instant transfers, saved beneficiaries and scheduled payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Transfers,
});

const inputClass =
  "w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/60";

function Transfers() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [beneficiary, setBeneficiary] = useState({ name: "", account_number: "" });
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [schedule, setSchedule] = useState({ frequency: "monthly", next_run: "" });
  const [scheduleOn, setScheduleOn] = useState(false);

  const dailyLimit = Number((profile as { daily_transfer_limit?: number } | null)?.daily_transfer_limit ?? 0);

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const beneficiaries = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Beneficiary[];
    },
  });

  const scheduled = useScheduledTransfers();

  const sentToday = useQuery({
    queryKey: ["sent-today"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("transactions")
        .select("amount")
        .lt("amount", 0)
        .gte("created_at", start.toISOString());
      if (error) return 0;
      return (data ?? []).reduce((s, r) => s + Math.abs(Number((r as { amount: number }).amount)), 0);
    },
  });

  const transfer = useMutation({
    mutationFn: async () => {
      const source = from || accounts.data?.[0]?.id;
      if (!source) throw new Error("Select an account to send from");
      const value = Number(amount);
      if (dailyLimit > 0 && (sentToday.data ?? 0) + value > dailyLimit) {
        throw new Error(`This exceeds your daily transfer limit of ${formatMoney(dailyLimit)}`);
      }

      if (scheduleOn) {
        if (!schedule.next_run) throw new Error("Pick a date for the scheduled transfer");
        const { data: session } = await supabase.auth.getUser();
        const { error } = await supabase.from("scheduled_transfers").insert({
          user_id: session.user?.id,
          from_account: source,
          to_account_number: to.trim(),
          amount: value,
          description: note || "Scheduled transfer",
          frequency: schedule.frequency,
          next_run: schedule.next_run,
        });
        if (error) throw error;
        return { scheduled: true } as const;
      }

    // Simulate a failed transfer.
await new Promise((resolve) => setTimeout(resolve, 2000));

throw new Error(
  "Transaction failed. Please contact customer support for assistance."
);
    },
    onSuccess: (result) => {
      toast.success("Transfer scheduled");
      setAmount("");
      setNote("");
      setScheduleOn(false);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Transfer failed. Please contact customer support."),
  });

  const saveBeneficiary = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase
          .from("beneficiaries")
          .update({ name: beneficiary.name, account_number: beneficiary.account_number })
          .eq("id", editing.id);
        if (error) throw error;
        return;
      }
      const { data: session } = await supabase.auth.getUser();
      const { error } = await supabase.from("beneficiaries").insert({
        user_id: session.user?.id,
        name: beneficiary.name,
        account_number: beneficiary.account_number,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Beneficiary updated" : "Beneficiary saved");
      setBeneficiary({ name: "", account_number: "" });
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["beneficiaries"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save beneficiary"),
  });

  const removeBeneficiary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beneficiaries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Beneficiary removed");
      void qc.invalidateQueries({ queryKey: ["beneficiaries"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove beneficiary"),
  });

  const toggleFavorite = useMutation({
    mutationFn: async (b: Beneficiary) => {
      const { error } = await supabase.from("beneficiaries").update({ is_favorite: !b.is_favorite }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["beneficiaries"] }),
  });

  const cancelSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_transfers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scheduled transfer cancelled");
      void qc.invalidateQueries({ queryKey: ["scheduled-transfers"] });
    },
  });

  return (
    <AppShell title="Transfers" subtitle="Instant money movement between VELORA accounts.">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Send money</h2>
            {dailyLimit > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatMoney(Math.max(dailyLimit - (sentToday.data ?? 0), 0))} left today
              </span>
            )}
          </div>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              transfer.mutate();
            }}
          >
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">From</label>
              <select className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)}>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.account_number} · {formatMoney(Number(a.balance), a.currency_code)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Beneficiary account number
              </label>
              <input
                className={inputClass}
                placeholder="4021 0000 0000"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Amount</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="250.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Reference</label>
                <input
                  className={inputClass}
                  placeholder="Rent, invoice #204…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 accent-current"
                checked={scheduleOn}
                onChange={(e) => setScheduleOn(e.target.checked)}
              />
              Schedule this transfer for later
            </label>

            {scheduleOn && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Start date</label>
                  <input
                    className={inputClass}
                    type="date"
                    value={schedule.next_run}
                    onChange={(e) => setSchedule((s) => ({ ...s, next_run: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Frequency</label>
                  <select
                    className={inputClass}
                    value={schedule.frequency}
                    onChange={(e) => setSchedule((s) => ({ ...s, frequency: e.target.value }))}
                  >
                    <option value="once">Once</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" disabled={transfer.isPending} className={btn({ size: "lg" }) + " w-full"}>
              {transfer.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : scheduleOn ? (
                <CalendarClock className="size-4" />
              ) : (
                <Send className="size-4" />
              )}
              {scheduleOn ? "Schedule transfer" : "Send transfer"}
            </button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Star className="size-4 text-primary" /> Beneficiaries
            </h2>
            <div className="mt-4 space-y-2">
              {(beneficiaries.data ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface/40 px-4 py-3"
                >
                  <button onClick={() => setTo(b.account_number)} className="flex-1 text-left">
                    <span className="block text-sm font-medium">{b.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{b.account_number}</span>
                  </button>
                  <button
                    aria-label="Toggle favourite"
                    onClick={() => toggleFavorite.mutate(b)}
                    className={b.is_favorite ? "text-amber-400" : "text-muted-foreground hover:text-foreground"}
                  >
                    <Star className={`size-4 ${b.is_favorite ? "fill-current" : ""}`} />
                  </button>
                  <button
                    aria-label="Edit beneficiary"
                    onClick={() => {
                      setEditing(b);
                      setBeneficiary({ name: b.name, account_number: b.account_number });
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    aria-label="Delete beneficiary"
                    onClick={() => removeBeneficiary.mutate(b.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {!(beneficiaries.data ?? []).length && (
                <p className="text-sm text-muted-foreground">No saved beneficiaries yet.</p>
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="size-4 text-primary" /> {editing ? "Edit beneficiary" : "Add beneficiary"}
            </h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveBeneficiary.mutate();
              }}
            >
              <input
                className={inputClass}
                placeholder="Full name"
                value={beneficiary.name}
                onChange={(e) => setBeneficiary((b) => ({ ...b, name: e.target.value }))}
                required
              />
              <input
                className={inputClass}
                placeholder="Account number"
                value={beneficiary.account_number}
                onChange={(e) => setBeneficiary((b) => ({ ...b, account_number: e.target.value }))}
                required
              />
              <div className="flex gap-2">
                <button className={btn({ variant: "ghost", size: "md" }) + " flex-1"} type="submit">
                  {editing ? "Update beneficiary" : "Save beneficiary"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className={btn({ variant: "ghost", size: "md" })}
                    onClick={() => {
                      setEditing(null);
                      setBeneficiary({ name: "", account_number: "" });
                    }}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </form>
          </Panel>

          <Panel>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="size-4 text-primary" /> Scheduled transfers
            </h2>
            <div className="mt-4 space-y-2">
              {(scheduled.data ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatMoney(Number(s.amount))} → <span className="font-mono text-xs">{s.to_account_number}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.frequency} · next {s.next_run} {s.is_active ? "" : "· paused"}
                    </p>
                  </div>
                  <button
                    aria-label="Cancel scheduled transfer"
                    onClick={() => cancelSchedule.mutate(s.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {!(scheduled.data ?? []).length && (
                <p className="text-sm text-muted-foreground">Nothing scheduled right now.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
