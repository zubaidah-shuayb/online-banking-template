import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Gauge,
  Users,
  Receipt,
  Wallet,
  Coins,
  Megaphone,
  BarChart3,
  Settings2,
  ScrollText,
  PlusCircle,
  Mail,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { veloraLogo as VeloraLogo } from "@/components/velora/logo";
import { cn } from "@/lib/utils";

export const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/new-transaction", label: "New transaction", icon: PlusCircle },
  { to: "/admin/balances", label: "Balances", icon: Wallet },
  { to: "/admin/currencies", label: "Currencies", icon: Coins },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/activity-logs", label: "Activity logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings2 },
] as const;

export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = (
    <nav className="flex flex-col gap-1">
      {ADMIN_LINKS.map((l) => {
        const Icon = l.icon;
        const active = pathname === l.to;
        return (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                : "text-muted-foreground hover:bg-surface hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1500px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border/60 px-5 py-7 lg:flex">
          <div className="space-y-8 overflow-y-auto">
            <div>
              <VeloraLogo />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Admin portal
              </p>
            </div>
            {nav}
          </div>
          <button
            onClick={() => void signOut("/admin/login")}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="rounded-xl border border-border p-2 lg:hidden"
                  onClick={() => setOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  {open ? <X className="size-4" /> : <Menu className="size-4" />}
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
                  {subtitle && (
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-right text-xs leading-tight text-muted-foreground sm:block">
                  <span className="block font-medium text-foreground">
                    {profile?.full_name || "Administrator"}
                  </span>
                  {profile?.email}
                </span>
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-semibold text-primary-foreground">
                  {(profile?.full_name || "A").slice(0, 1).toUpperCase()}
                </div>
              </div>
            </div>

            {open && (
              <div className="mt-4 space-y-4 lg:hidden">
                {nav}
                <button
                  onClick={() => void signOut("/admin/login")}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </header>

          <motion.main
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}

export const adminInput =
  "w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none focus:border-primary/60";
