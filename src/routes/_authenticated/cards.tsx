import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CreditCard, Snowflake, Copy, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, Skeleton } from "@/components/velora/app-shell";
import { BankCard } from "@/components/velora/bank-card";
import { btn } from "@/components/velora/ui";
import { supabase } from "@/integrations/velora/client";
import { useAuth } from "@/lib/auth";
import { useAccounts, useCards } from "@/lib/dashboard-data";
import { formatMoney, type Account, type CardRow } from "@/integrations/velora/types";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Your cards — VELORA Bank" },
      { name: "description", content: "Freeze cards, set spending limits and manage your VELORA virtual debit cards." },
      { property: "og:title", content: "Your cards — VELORA Bank" },
      { property: "og:description", content: "Premium virtual cards with instant freeze, limits and PIN control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardsPage,
});

const field =
  "h-10 w-full rounded-xl border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/60";

function CardControls({ account, card }: { account: Account; card: CardRow | undefined }) {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(card?.spend_limit != null ? String(card.spend_limit) : "");
  const [pin, setPin] = useState("");

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["cards"] });

  const freeze = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("Card not ready yet");
      const { error } = await supabase.from("cards").update({ is_frozen: !card.is_frozen }).eq("id", card.id);
      if (error) throw error;
      return !card.is_frozen;
    },
    onSuccess: (frozen) => {
      toast.success(frozen ? "Card frozen" : "Card unfrozen");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update card"),
  });

  const saveLimit = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("Card not ready yet");
      const value = limit.trim() === "" ? null : Number(limit);
      if (value !== null && (!Number.isFinite(value) || value <= 0)) throw new Error("Enter a valid limit");
      const { error } = await supabase.from("cards").update({ spend_limit: value }).eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Spending limit updated");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save limit"),
  });

  const savePin = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("Card not ready yet");
      if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
      const { error } = await supabase.rpc("set_card_pin", { _card_id: card.id, _pin: pin });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Card PIN updated");
      setPin("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not set PIN"),
  });

  const frozen = card?.is_frozen || account.is_frozen;

  return (
    <Panel className="space-y-3 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Balance</span>
        <span className="font-semibold tabular-nums">
          {formatMoney(Number(account.balance), account.currency_code)}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Account number</span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(account.account_number);
            toast.success("Account number copied");
          }}
          className="flex items-center gap-1.5 font-mono text-xs hover:text-primary"
        >
          {account.account_number} <Copy className="size-3" />
        </button>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Status</span>
        <span className={frozen ? "text-amber-500" : "text-emerald-500"}>
          {frozen ? (
            <span className="flex items-center gap-1">
              <Snowflake className="size-3" /> Frozen
            </span>
          ) : (
            "Active"
          )}
        </span>
      </div>

      <button
        className={btn({ variant: card?.is_frozen ? "primary" : "ghost", size: "sm" }) + " w-full"}
        disabled={!card || freeze.isPending}
        onClick={() => freeze.mutate()}
      >
        <Snowflake className="size-3.5" />
        {card?.is_frozen ? "Unfreeze card" : "Freeze card"}
      </button>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Monthly spending limit
        </label>
        <div className="flex gap-2">
          <input
            className={field}
            type="number"
            min="0"
            step="0.01"
            placeholder="No limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <button
            className={btn({ variant: "ghost", size: "sm" })}
            disabled={!card || saveLimit.isPending}
            onClick={() => saveLimit.mutate()}
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Lock className="size-3" /> Card PIN {card?.pin_set && <ShieldCheck className="size-3 text-emerald-500" />}
        </label>
        <div className="flex gap-2">
          <input
            className={field}
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          <button
            className={btn({ variant: "ghost", size: "sm" })}
            disabled={!card || savePin.isPending}
            onClick={() => savePin.mutate()}
          >
            {card?.pin_set ? "Change" : "Set PIN"}
          </button>
        </div>
      </div>
    </Panel>
  );
}

function CardsPage() {
  const { profile, user } = useAuth();
  const accounts = useAccounts();
  const cards = useCards();
  const list = accounts.data ?? [];
  const holder =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    String(user?.user_metadata?.full_name ?? user?.email ?? "");

  return (
    <AppShell title="Cards" subtitle="Freeze, limit and secure every VELORA card.">
      {accounts.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[1.62/1] rounded-[26px]" />
          ))}
        </div>
      ) : list.length ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="space-y-3"
            >
              <BankCard account={a} holder={holder} index={i} />
              <CardControls account={a} card={cards.data?.find((c) => c.account_id === a.id)} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Panel className="py-16 text-center">
          <CreditCard className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">
            No cards yet — accounts create cards automatically.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </Panel>
      )}
    </AppShell>
  );
}
