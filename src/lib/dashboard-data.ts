import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/velora/client";
import { useAuth } from "@/lib/auth";
import type {
  Account,
  Announcement,
  BankSettings,
  Beneficiary,
  CardRow,
  Currency,
  NotificationRow,
  ScheduledTransfer,
  Transaction,
} from "@/integrations/velora/types";


export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["accounts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`accounts:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["accounts", user.id] }),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") console.error("[realtime] Account balance subscription failed");
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return query;
}

export function useTransactions(limit = 250) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id, limit],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function useBeneficiaries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["beneficiaries", user?.id],
    enabled: Boolean(user?.id),
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
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
  });
}

/** Convert an amount from one currency to another using rate_to_usd. */
export function convert(
  amount: number,
  from: string,
  to: string,
  currencies: Currency[] | undefined,
) {
  if (!currencies?.length || from === to) return amount;
  const f = currencies.find((c) => c.code === from)?.rate_to_usd ?? 1;
  const t = currencies.find((c) => c.code === to)?.rate_to_usd ?? 1;
  if (!f || !t) return amount;
  return (amount / Number(f)) * Number(t);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string | null | undefined) {
  const parts = (name || "V").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "V";
}

export function monthKey(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short" });
}

export function useCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cards", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("id, account_id, last4, is_frozen, spend_limit, pin_set, created_at")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CardRow[];
    },
  });
}

export function useScheduledTransfers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scheduled-transfers", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_transfers")
        .select("*")
        .order("next_run");
      if (error) throw error;
      return (data ?? []) as ScheduledTransfer[];
    },
  });
}

/** Bank-wide settings — readable by everyone (maintenance mode, default skin). */
export function useBankSettings() {
  return useQuery({
    queryKey: ["bank-settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_settings").select("*").maybeSingle();
      if (error) return null;
      return (data ?? null) as BankSettings | null;
    },
  });
}

export function useDismissedAnnouncements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["announcement-dismissals", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("announcement_dismissals").select("announcement_id");
      if (error) return [] as string[];
      return (data ?? []).map((r) => (r as { announcement_id: string }).announcement_id);
    },
  });
}

/** Runs any transfers the customer scheduled that are now due. */
export function useRunDueTransfers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data, error } = await supabase.rpc("run_due_scheduled_transfers");
      if (!error && Number(data) > 0) {
        void queryClient.invalidateQueries({ queryKey: ["accounts", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["transactions"] });
        void queryClient.invalidateQueries({ queryKey: ["scheduled-transfers", user.id] });
      }
    })();
  }, [queryClient, user?.id]);
}

