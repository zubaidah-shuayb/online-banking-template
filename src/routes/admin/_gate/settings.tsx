import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/velora/client";
import { AdminShell, adminInput } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useBankSettings, logAdminAction } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/_gate/settings")({
  head: () => ({
    meta: [
      { title: "Bank settings — VELORA Bank admin" },
      { name: "description", content: "Configure VELORA bank name, tagline, default skin and maintenance mode." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Bank settings — VELORA Bank admin" },
      { property: "og:description", content: "Configure VELORA Bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const initial = useBankSettings().data;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    bank_name: "VELORA Bank",
    tagline: "",
    support_email: "",
    default_skin: "classic",
    maintenance_mode: false,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        bank_name: (initial.bank_name as string) ?? "VELORA Bank",
        tagline: (initial.tagline as string) ?? "",
        support_email: (initial.support_email as string) ?? "",
        default_skin: (initial.default_skin as string) ?? "classic",
        maintenance_mode: Boolean(initial.maintenance_mode),
      });
    }
  }, [initial]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bank_settings").update(form).eq("id", true);
      if (error) throw error;
      await logAdminAction("update_settings", "bank_settings");
    },
    onSuccess: () => {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <AdminShell title="Bank settings" subtitle="Global configuration for VELORA Bank.">
      <Panel className="max-w-xl">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <input className={adminInput} value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Bank name" />
          <input className={adminInput} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" />
          <input className={adminInput} value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="Support email" />
          <select className={adminInput} value={form.default_skin} onChange={(e) => setForm({ ...form, default_skin: e.target.value })}>
            <option value="classic">Classic Blue</option>
            <option value="emerald">Emerald</option>
            <option value="midnight">Midnight</option>
            <option value="indigo">Royal Indigo</option>
          </select>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.maintenance_mode} onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })} />
            Maintenance mode
          </label>
          <button className={btn({ size: "md" }) + " w-full"} type="submit">
            Save settings
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
