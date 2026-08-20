import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/velora/client";
import type { Profile } from "@/integrations/velora/types";

type AuthValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: (destination?: "/login" | "/admin/login") => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  loading: true,
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: prof, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (profileError) console.error("[auth] Failed to load profile", { uid, error: profileError });
    if (rolesError) console.error("[auth] Failed to load roles", { uid, error: rolesError });
  const loadedProfile = (prof as Profile) ?? null;

if (loadedProfile?.is_frozen) {
  await supabase.auth.signOut();
  setProfile(null);
  setIsAdmin(false);
  return;
}

setProfile(loadedProfile);
setIsAdmin(Boolean(roles?.some((r: { role: string }) => r.role === "admin")));
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error("[auth] Failed to restore session", sessionError);
      const restored = sessionData.session;
      if (restored) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          console.error("[auth] Restored session could not be validated", userError);
          if (active) setSession(null);
        } else if (active) {
          setSession(restored);
          await load(userData.user.id);
        }
      }
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load(next?.user.id);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await load(data.session?.user.id);
  }, [load]);

  const signOut = useCallback(async (destination: "/login" | "/admin/login" = "/login") => {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[auth] Sign out failed", error);
      throw error;
    }
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    await navigate({ to: destination, replace: true });
  }, [navigate, queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      refresh,
      signOut,
    }),
    [loading, session, profile, isAdmin, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
