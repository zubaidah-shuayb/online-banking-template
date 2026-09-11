import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/velora/client";
import { AdminShell, adminInput } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useAnnouncements, logAdminAction } from "@/lib/admin-data";
import { formatDate } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — velora Bank admin" },
      { name: "description", content: "Publish bank-wide announcements to velora customers." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Announcements — velora Bank admin" },
      { property: "og:description", content: "Publish bank-wide announcements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const rows = useAnnouncements().data ?? [];
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", severity: "info" });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert(form);
      if (error) throw error;
      await logAdminAction("create_announcement", "announcement", undefined, { title: form.title });
    },
    onSuccess: () => {
      toast.success("Announcement published");
      setForm({ title: "", body: "", severity: "info" });
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("delete_announcement", "announcement", id);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <AdminShell title="Announcements" subtitle="Broadcast messages to every velora customer.">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Panel>
          <h2 className="text-base font-semibold">New announcement</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <input className={adminInput} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea className={adminInput + " min-h-28 resize-none"} placeholder="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <select className={adminInput} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <button className={btn({ size: "md" }) + " w-full"} type="submit">
              Publish
            </button>
          </form>
        </Panel>

        <div className="space-y-3">
          {rows.map((a) => (
            <Panel key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                    {a.severity} · {formatDate(a.created_at)}
                  </p>
                </div>
                <button className="text-xs text-destructive hover:underline" onClick={() => remove.mutate(a.id)}>
                  Delete
                </button>
              </div>
            </Panel>
          ))}
          {!rows.length && <Panel className="text-sm text-muted-foreground">No announcements.</Panel>}
        </div>
      </div>
    </AdminShell>
  );
}
