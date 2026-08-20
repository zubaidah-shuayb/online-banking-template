import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare const __VELORA_SUPABASE_URL__: string;
declare const __VELORA_SUPABASE_ANON_KEY__: string;

// Publishable values — safe to ship to the browser. These are the source of
// truth so the app never silently falls back to a local/offline endpoint
// (which is what produced "Failed to fetch") if build-time injection is empty.
const FALLBACK_URL = "https://xtnjjivnhuxmeaajqtmr.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_n-F0IP40BPygeWvsM4svQA_H3MC7ZI7";

function pick(injected: string | undefined, viteVar: unknown, fallback: string) {
  if (typeof injected === "string" && injected.length > 0) return injected;
  if (typeof viteVar === "string" && viteVar.length > 0) return viteVar;
  return fallback;
}

export const SUPABASE_URL = pick(
  typeof __VELORA_SUPABASE_URL__ !== "undefined" ? __VELORA_SUPABASE_URL__ : undefined,
  import.meta.env.VITE_VELORA_SUPABASE_URL,
  FALLBACK_URL,
);

export const SUPABASE_ANON_KEY = pick(
  typeof __VELORA_SUPABASE_ANON_KEY__ !== "undefined" ? __VELORA_SUPABASE_ANON_KEY__ : undefined,
  import.meta.env.VITE_VELORA_SUPABASE_ANON_KEY,
  FALLBACK_ANON_KEY,
);

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const isBrowser = typeof window !== "undefined";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    storageKey: "velora.auth",
  },
});
