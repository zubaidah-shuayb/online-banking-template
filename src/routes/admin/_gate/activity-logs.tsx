import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/velora/admin-shell";
import { Panel } from "@/components/velora/app-shell";
import { useActivityLogs } from "@/lib/admin-data";
import { formatDate } from "@/integrations/velora/types";

export const Route = createFileRoute("/admin/_gate/activity-logs")({
  head: () => ({
    meta: [
      { title: "Activity logs — velora Bank admin" },
      { name: "description", content: "Audit trail of every administrative action at velora Bank." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Activity logs — velora Bank admin" },
      { property: "og:description", content: "Administrative audit trail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogs,
});

function AdminLogs() {
  const rows = useActivityLogs(200).data ?? [];

  return (
    <AdminShell title="Activity logs" subtitle="Every administrative action, newest first.">
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="py-3 font-medium">When</th>
              <th className="py-3 font-medium">Actor</th>
              <th className="py-3 font-medium">Action</th>
              <th className="py-3 font-medium">Target</th>
              <th className="py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="py-3 text-muted-foreground">{formatDate(l.created_at)}</td>
                <td className="py-3 text-xs text-muted-foreground">{l.actor_email ?? "—"}</td>
                <td className="py-3">{l.action}</td>
                <td className="py-3 font-mono text-xs text-muted-foreground">
                  {l.target_type}:{l.target_id?.slice(0, 8)}
                </td>
                <td className="py-3 text-xs text-muted-foreground">{JSON.stringify(l.details)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No admin activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AdminShell>
  );
}
