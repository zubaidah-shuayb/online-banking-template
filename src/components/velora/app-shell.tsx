import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  ScanLine,
  Settings,
  Activity,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { SkinSwitcher } from "@/components/velora/skin-switcher";
import { veloraLogo } from "@/components/velora/logo";
import { MaintenanceBanner } from "@/components/velora/maintenance-banner";
import { greeting, initials, useNotifications } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/statements", label: "Statements", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const bottomLinks = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/statements", label: "Activity", icon: Activity },
  { to: "/transfers", label: "Transfer", icon: ArrowLeftRight },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function Avatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
}) {
  return url ? (
    <img
      src={url}
      alt={name || "Profile picture"}
      className={cn("size-10 shrink-0 rounded-full object-cover ring-2 ring-primary/30", className)}
    />
  ) : (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-sm font-semibold text-primary-foreground ring-2 ring-primary/20",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AppShell({
  title,
  subtitle,
  greetingHeader = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  greetingHeader?: boolean;
  children: ReactNode;
}) {
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const notifications = useNotifications();
  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    String(user?.user_metadata?.full_name ?? user?.email ?? "");

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const Icon = l.icon;
        const active = pathname === l.to;
        return (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
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
          <div className="space-y-8">
            <Link to="/">
              <veloraLogo />
            </Link>
            {nav}
          </div>
          <div className="space-y-4">
            <SkinSwitcher />
            <button
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="rounded-xl border border-border p-2 lg:hidden"
                  onClick={() => setOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  {open ? <X className="size-4" /> : <Menu className="size-4" />}
                </button>

                {greetingHeader ? (
                  <Link to="/profile" className="flex min-w-0 items-center gap-3">
                    <Avatar url={profile?.avatar_url} name={fullName} className="size-11" />
                    <span className="min-w-0">
                      <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {greeting()}
                      </span>
                      <span className="block truncate text-base font-semibold sm:text-lg">
                        {fullName}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
                    {subtitle && (
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <IconAction to="/transfers" label="Scan to pay">
                  <ScanLine className="size-[18px]" />
                </IconAction>
                <IconAction to="/notifications" label="Notifications" badge={unread}>
                  <Bell className="size-[18px]" />
                </IconAction>
                <IconAction to="/profile" label="Settings">
                  <Settings className="size-[18px]" />
                </IconAction>
                {!greetingHeader && (
                  <Link to="/profile" className="ml-1 hidden sm:block">
                    <Avatar url={profile?.avatar_url} name={fullName} />
                  </Link>
                )}
              </div>
            </div>

            {open && (
              <div className="mt-4 space-y-4 lg:hidden">
                {nav}
                <SkinSwitcher />
                <button
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </header>

          <MaintenanceBanner />

          <motion.main

            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8"
          >
            {children}
          </motion.main>
        </div>
      </div>

      <BottomNav pathname={pathname} />
    </div>
  );
}

function IconAction({
  to,
  label,
  badge,
  children,
}: {
  to: string;
  label: string;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative grid size-10 place-items-center rounded-2xl border border-border/70 bg-surface/50 text-muted-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground"
    >
      {children}
      {Boolean(badge) && (
        <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge! > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
        {bottomLinks.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.to;
          return (
            <Link
              key={l.label}
              to={l.to}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium"
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl bg-primary/12"
                />
              )}
              <Icon
                className={cn(
                  "relative size-[19px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className={cn("relative", active ? "text-foreground" : "text-muted-foreground")}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/70 bg-card/60 p-5 shadow-[0_18px_50px_-40px_var(--primary)] backdrop-blur-xl sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface/70", className)} />;
}
