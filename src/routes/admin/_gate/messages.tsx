import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MailCheck, MailOpen } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { btn } from "@/components/velora/ui";
import { useContactMessages, logAdminAction } from "@/lib/admin-data";
import { formatDate } from "@/integrations/velora/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/_gate/messages")({
  head: () => ({
    meta: [
      { title: "Messages — VELORA Bank admin" },
      { name: "description", content: "Customer enquiries and support messages sent to VELORA Bank." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Messages — VELORA Bank admin" },
      { property: "og:description", content: "Customer enquiries inbox." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminMessages,
});

function AdminMessages() {
  const messages = useContactMessages();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "handled" | "all">("open");

  const rows = (messages.data ?? []).filter((m) =>
    filter === "all" ? true : filter === "handled" ? m.is_handled : !m.is_handled,
  );

  const setHandled = useMutation({
    mutationFn: async ({ id, handled }: { id: string; handled: boolean }) => {
      const { error } = await supabase.from("contact_messages").update({ is_handled: handled }).eq("id", id);
      if (error) throw error;
      await logAdminAction(handled ? "resolve_message" : "reopen_message", "contact_message", id);
    },
    onSuccess: () => {
      toast.success("Message updated");
      void qc.invalidateQueries({ queryKey: ["admin-messages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <AdminShell title="Messages" subtitle="Enquiries submitted through the VELORA contact form.">
      <div className="mb-4 flex gap-1.5">
        {(["open", "handled", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3.5 py-2 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rows.map((m) => (
          <Panel key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{m.subject || "No subject"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.name} · {m.email} · {m.kind}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">{formatDate(m.created_at)}</p>
              </div>
              <button
                className={btn({ variant: "ghost", size: "sm" })}
                onClick={() => setHandled.mutate({ id: m.id, handled: !m.is_handled })}
              >
                {m.is_handled ? (
                  <>
                    <MailOpen className="mr-1.5 size-3.5" /> Reopen
                  </>
                ) : (
                  <>
                    <MailCheck className="mr-1.5 size-3.5" /> Mark handled
                  </>
                )}
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-border/60 bg-surface/40 p-4 text-sm leading-relaxed text-muted-foreground">
              {m.message}
            </p>
          </Panel>
        ))}
        {!rows.length && <Panel className="text-sm text-muted-foreground">No messages here.</Panel>}
      </div>
    </AdminShell>
  );
}
