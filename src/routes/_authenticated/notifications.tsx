import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Megaphone, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel, Skeleton } from "@/components/velora/app-shell";
import { supabase } from "@/integrations/velora/client";
import { useAnnouncements, useDismissedAnnouncements, useNotifications } from "@/lib/dashboard-data";
import { formatDate, notificationText } from "@/integrations/velora/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — VELORA Bank" },
      { name: "description", content: "Your VELORA notification center: alerts, transaction updates and bank announcements." },
      { property: "og:title", content: "Notifications — VELORA Bank" },
      { property: "og:description", content: "Alerts, transaction updates and announcements in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const notifications = useNotifications();
  const announcements = useAnnouncements();
  const dismissed = useDismissedAnnouncements();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const rows = (notifications.data ?? []).filter((n) =>
    filter === "all" ? true : filter === "unread" ? !n.is_read : n.is_read,
  );
  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const dismiss = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("announcement_dismissals")
        .insert({ announcement_id: announcementId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["announcement-dismissals"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not dismiss"),
  });

  const visibleAnnouncements = (announcements.data ?? []).filter(
    (a) => !(dismissed.data ?? []).includes(a.id),
  );

  return (
    <AppShell title="Notifications" subtitle={unread ? `${unread} unread` : "You're all caught up."}>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {(["all", "unread", "read"] as const).map((f) => (
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
            <button
              onClick={() =>
                markRead.mutate((notifications.data ?? []).filter((n) => !n.is_read).map((n) => n.id))
              }
              disabled={!unread}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-40"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {notifications.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}

            {!notifications.isLoading &&
              rows.map((n, i) => (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !n.is_read && markRead.mutate([n.id])}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    n.is_read
                      ? "border-border/60 bg-surface/30"
                      : "border-primary/40 bg-primary/8 hover:bg-primary/12",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                    <Bell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{notificationText(n.title)}</span>
                      {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{notificationText(n.body)}</span>
                    <span className="mt-2 block text-[11px] text-muted-foreground/70">
                      {formatDate(n.created_at)}
                    </span>
                  </span>
                </motion.button>
              ))}

            {!notifications.isLoading && !rows.length && (
              <div className="py-14 text-center">
                <BellOff className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Megaphone className="size-4 text-primary" /> Announcements
          </h2>
          <div className="mt-4 space-y-3">
            {visibleAnnouncements.map((a) => (
              <div key={a.id} className="relative rounded-2xl border border-border/60 bg-surface/40 p-4">
                <button
                  aria-label="Dismiss announcement"
                  onClick={() => dismiss.mutate(a.id)}
                  className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
                <p className="pr-6 text-sm font-medium">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground/70">{formatDate(a.created_at)}</p>
              </div>
            ))}
            {!visibleAnnouncements.length && (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            )}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
