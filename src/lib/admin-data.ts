import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/velora/client";
import type {
  Account,
  ActivityLog,
  Announcement,
  Currency,
  Profile,
  Transaction,
  ContactMessage,
} from "@/integrations/velora/types";

export function useProfiles() {
  return useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });
}

export function useTransactions(limit = 200) {
  return useQuery({
    queryKey: ["admin-transactions", limit],
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

export function useCurrencies() {
  return useQuery({
    queryKey: ["admin-currencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("*").order("code");
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });
}

export function useActivityLogs(limit = 100) {
  return useQuery({
    queryKey: ["admin-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityLog[];
    },
  });
}

export function useBankSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_settings").select("*").maybeSingle();
      if (error) throw error;
      return (data ?? null) as Record<string, unknown> | null;
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as { user_id: string; role: string }[];
    },
  });
}

export function useContactMessages() {
  return useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ContactMessage[];
    },
  });
}

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
) {
  await supabase.from("admin_activity_logs").insert({
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    details: details ?? {},
  });
}

