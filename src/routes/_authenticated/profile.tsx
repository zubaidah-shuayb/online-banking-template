import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, LogOut, Trash2, KeyRound, User as UserIcon, BellRing, ShieldCheck } from "lucide-react";
import { AppShell, Avatar, Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { supabase } from "@/integrations/velora/client";
import { useAuth } from "@/lib/auth";
import { useAccounts, useCurrencies } from "@/lib/dashboard-data";
import { formatDate } from "@/integrations/velora/types";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — VELORA Bank" },
      { name: "description", content: "Manage your VELORA profile picture, personal details, preferred currency and password." },
      { property: "og:title", content: "Your profile — VELORA Bank" },
      { property: "og:description", content: "Manage your VELORA identity, currency preference and security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const inputClass =
  "w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/60";

function ProfilePage() {
  const { user, profile, refresh, signOut } = useAuth();
  const accounts = useAccounts();
  const currencies = useCurrencies();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    preferred_currency: "USD",
  });
  const [password, setPassword] = useState({ next: "", confirm: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? profile.full_name?.split(" ")[0] ?? "",
      last_name: profile.last_name ?? profile.full_name?.split(" ").slice(1).join(" ") ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      preferred_currency: profile.preferred_currency ?? "USD",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const full_name = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
      const { error } = await supabase
        .from("profiles")
        .update({ ...form, full_name })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      if (!file.type.startsWith("image/")) throw new Error("Choose a valid image file");
      if (file.size > 5 * 1024 * 1024) throw new Error("Profile pictures must be smaller than 5 MB");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || authData.user?.id !== user.id) throw authError ?? new Error("Your session expired");
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) {
        console.error("[profile] Avatar storage upload failed", { path, error });
        throw new Error(`Profile picture upload failed: ${error.message}`);
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ avatar_url: `${data.publicUrl}?v=${Date.now()}` })
        .eq("id", user.id);
      if (upErr) {
        console.error("[profile] Avatar profile update failed", { path, error: upErr });
        throw new Error(`Profile picture was uploaded but could not be saved: ${upErr.message}`);
      }
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Profile picture updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const removePhoto = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Profile picture removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove picture"),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (password.next.length < 8) throw new Error("Password must be at least 8 characters");
      if (password.next !== password.confirm) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: password.next });
      if (error) throw error;
    },
    onSuccess: () => {
      setPassword({ next: "", confirm: "" });
      toast.success("Password changed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not change password"),
  });

  const prefs = {
    notify_email: profile?.notify_email ?? true,
    notify_push: profile?.notify_push ?? true,
    notify_marketing: profile?.notify_marketing ?? false,
  };

  const savePrefs = useMutation({
    mutationFn: async (patch: Record<string, boolean>) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      await refresh();
    },
    onSuccess: () => toast.success("Preferences saved"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save preferences"),
  });

  const [limit, setLimit] = useState("");
  useEffect(() => {
    if (profile?.daily_transfer_limit != null) setLimit(String(profile.daily_transfer_limit));
  }, [profile?.daily_transfer_limit]);

  const saveLimit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const value = limit.trim() === "" ? null : Number(limit);
      if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("profiles").update({ daily_transfer_limit: value }).eq("id", user.id);
      if (error) throw error;
      await refresh();
    },
    onSuccess: () => toast.success("Daily transfer limit updated"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update limit"),
  });

  const signOutEverywhere = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
    },
    onSuccess: () => void signOut(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not sign out sessions"),
  });

  const fullName =
    [form.first_name, form.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    String(user?.user_metadata?.full_name ?? user?.email ?? "");

  return (
    <AppShell title="Profile" subtitle="Manage your identity, preferences and security.">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Panel className="text-center">
            <div className="relative mx-auto w-fit">
              <Avatar url={profile?.avatar_url} name={fullName} className="size-28 ring-4" />
              <button
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg transition-transform hover:scale-105"
              >
                {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="mt-4 text-lg font-semibold">{fullName}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => fileRef.current?.click()} className={btn({ variant: "ghost", size: "sm" })}>
                <Camera className="size-4" /> Change
              </button>
              {profile?.avatar_url && (
                <button
                  onClick={() => removePhoto.mutate()}
                  className={btn({ variant: "ghost", size: "sm" })}
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              )}
            </div>
          </Panel>

          <Panel className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <UserIcon className="size-4 text-primary" /> Account information
            </h2>
            <Info label="Customer ID" value={user?.id?.slice(0, 8) ?? "—"} />
            <Info label="Member since" value={profile ? formatDate(profile.created_at) : "—"} />
            <Info label="KYC status" value={profile?.kyc_status ?? "—"} />
            <Info label="Accounts" value={String((accounts.data ?? []).length)} />
            <button
              onClick={() => void signOut()}
              className={btn({ variant: "ghost", size: "md", class: "mt-2 w-full" })}
            >
              <LogOut className="size-4" /> Log out
            </button>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="space-y-4">
            <h2 className="text-base font-semibold">Personal details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name">
                <input
                  className={inputClass}
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </Field>
              <Field label="Last name">
                <input
                  className={inputClass}
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </Field>
              <Field label="Phone number">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Preferred currency">
                <select
                  className={inputClass}
                  value={form.preferred_currency}
                  onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
                >
                  {(currencies.data ?? []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Address" full>
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
            </div>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className={btn({ size: "md" })}
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </button>
          </Panel>

          <Panel className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="size-4 text-primary" /> Change password
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="New password">
                <input
                  type="password"
                  className={inputClass}
                  value={password.next}
                  onChange={(e) => setPassword({ ...password, next: e.target.value })}
                />
              </Field>
              <Field label="Confirm password">
                <input
                  type="password"
                  className={inputClass}
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                />
              </Field>
            </div>
            <button
              onClick={() => changePassword.mutate()}
              disabled={changePassword.isPending}
              className={btn({ variant: "ghost", size: "md" })}
            >
              {changePassword.isPending && <Loader2 className="size-4 animate-spin" />}
              Update password
            </button>
          </Panel>

          <Panel className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BellRing className="size-4 text-primary" /> Notification preferences
            </h2>
            <div className="space-y-2">
              <Toggle
                label="Email alerts"
                hint="Transaction receipts and security notices by email."
                checked={prefs.notify_email}
                onChange={(v) => savePrefs.mutate({ notify_email: v })}
              />
              <Toggle
                label="In-app alerts"
                hint="Show alerts in your notification centre."
                checked={prefs.notify_push}
                onChange={(v) => savePrefs.mutate({ notify_push: v })}
              />
              <Toggle
                label="Product news"
                hint="Occasional updates about new VELORA features."
                checked={prefs.notify_marketing}
                onChange={(v) => savePrefs.mutate({ notify_marketing: v })}
              />
            </div>
          </Panel>

          <Panel className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="size-4 text-primary" /> Security
            </h2>
            <Field label="Daily transfer limit">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={limit}
                placeholder="No limit"
                onChange={(e) => setLimit(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => saveLimit.mutate()}
                disabled={saveLimit.isPending}
                className={btn({ variant: "ghost", size: "md" })}
              >
                {saveLimit.isPending && <Loader2 className="size-4 animate-spin" />}
                Save limit
              </button>
              <button
                onClick={() => signOutEverywhere.mutate()}
                disabled={signOutEverywhere.isPending}
                className={btn({ variant: "ghost", size: "md" })}
              >
                <LogOut className="size-4" /> Sign out all devices
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/60 bg-surface/40 p-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? "block sm:col-span-2" : "block"}>
      <span className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
