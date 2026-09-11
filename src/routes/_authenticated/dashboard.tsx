import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Users,
  FileText,
  CreditCard,
  Bell,
  PiggyBank,
  Banknote,
  LineChart as LineChartIcon,
  Landmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Sparkles,
  ShieldCheck,
  Megaphone,
  Receipt,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell, Avatar, Panel, Skeleton } from "@/components/velora/app-shell";
import { BankCard } from "@/components/velora/bank-card";
import { useAuth } from "@/lib/auth";
import {
  convert,
  initials,
  useAccounts,
  useAnnouncements,
  useDismissedAnnouncements,
  useBeneficiaries,
  useCurrencies,
  useNotifications,
  useTransactions,
} from "@/lib/dashboard-data";
import { formatDate, formatMoney, notificationText, txnCategory, txnDescription, txnLabel, type Transaction } from "@/integrations/velora/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your money — velora Bank" },
      {
        name: "description",
        content:
          "Premium banking dashboard: virtual cards, balances, insights, analytics and instant transfers.",
      },
      { property: "og:title", content: "Your money — velora Bank" },
      {
        property: "og:description",
        content: "Cards, balances, analytics and insights inside your velora dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { label: "Transfer", icon: ArrowLeftRight, to: "/transfers" },
  { label: "Beneficiaries", icon: Users, to: "/transfers" },
  { label: "Statements", icon: FileText, to: "/statements" },
  { label: "Cards", icon: CreditCard, to: "/cards" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "Deposit", icon: ArrowDownLeft, to: "/transfers" },
  { label: "Withdraw", icon: ArrowUpRight, to: "/transfers" },
  { label: "Investments", icon: LineChartIcon, to: "/cards" },
  { label: "Loans", icon: Landmark, to: "/cards" },
  { label: "Settings", icon: Settings, to: "/profile" },
] as const;

const PAGE_SIZE = 6;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Dashboard() {
  const { profile, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const accounts = useAccounts();
  const transactions = useTransactions();
  const beneficiaries = useBeneficiaries();
  const notifications = useNotifications();
  const announcements = useAnnouncements();
  const dismissedAnnouncements = useDismissedAnnouncements();
  const currencies = useCurrencies();

  const [cardIndex, setCardIndex] = useState(0);
  const [display, setDisplay] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "pending">("all");
  const [page, setPage] = useState(0);

  const list = accounts.data ?? [];
  const txns = transactions.data ?? [];
  const currency = display ?? profile?.preferred_currency ?? list[0]?.currency_code ?? "USD";

  const holder =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    String(user?.user_metadata?.full_name ?? user?.email ?? "");

  const total = list.reduce(
    (sum, a) => sum + convert(Number(a.balance), a.currency_code, currency, currencies.data),
    0,
  );

  const flow = useMemo(() => {
    const now = new Date();
    const thisMonth = txns.filter((t) => new Date(t.created_at).getMonth() === now.getMonth());
    const lastMonth = txns.filter((t) => new Date(t.created_at).getMonth() === (now.getMonth() + 11) % 12);
    const sum = (rows: Transaction[], sign: 1 | -1) =>
      rows
        .filter((t) => (sign === 1 ? Number(t.amount) >= 0 : Number(t.amount) < 0))
        .reduce((s, t) => s + convert(Math.abs(Number(t.amount)), t.currency_code, currency, currencies.data), 0);
    return {
      income: sum(thisMonth, 1),
      expense: sum(thisMonth, -1),
      prevExpense: sum(lastMonth, -1),
      pending: txns.filter((t) => t.status === "pending").length,
    };
  }, [txns, currency, currencies.data]);

  const monthly = useMemo(() => {
    const buckets = new Map<string, { month: string; income: number; expense: number; savings: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString(undefined, { month: "short" });
      buckets.set(key, { month: key, income: 0, expense: 0, savings: 0 });
    }
    txns.forEach((t) => {
      const key = new Date(t.created_at).toLocaleDateString(undefined, { month: "short" });
      const b = buckets.get(key);
      if (!b) return;
      const value = convert(Math.abs(Number(t.amount)), t.currency_code, currency, currencies.data);
      if (Number(t.amount) >= 0) b.income += value;
      else b.expense += value;
    });
    let running = 0;
    return [...buckets.values()].map((b) => {
      running += b.income - b.expense;
      return { ...b, savings: Math.max(running, 0) };
    });
  }, [txns, currency, currencies.data]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    txns
      .filter((t) => Number(t.amount) < 0)
      .forEach((t) => {
        const key = txnCategory(t.category) || "other";
        map.set(
          key,
          (map.get(key) ?? 0) +
            convert(Math.abs(Number(t.amount)), t.currency_code, currency, currencies.data),
        );
      });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [txns, currency, currencies.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter((t) => {
      if (filter === "in" && Number(t.amount) < 0) return false;
      if (filter === "out" && Number(t.amount) >= 0) return false;
      if (filter === "pending" && t.status !== "pending") return false;
      if (!q) return true;
      return [t.counterparty_name, txnDescription(t), t.reference, txnCategory(t.category), txnLabel(t.type)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [txns, query, filter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const completion = useMemo(() => {
    const fields = [
      profile?.first_name,
      profile?.last_name,
      profile?.email,
      profile?.phone,
      profile?.address,
      profile?.avatar_url,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const spendDelta =
    flow.prevExpense > 0 ? Math.round(((flow.expense - flow.prevExpense) / flow.prevExpense) * 100) : 0;

  const insights = [
    {
      icon: Sparkles,
      text:
        spendDelta === 0
          ? "Your spending is steady compared with last month."
          : spendDelta < 0
            ? `You've spent ${Math.abs(spendDelta)}% less this month.`
            : `You've spent ${spendDelta}% more this month.`,
    },
    {
      icon: PiggyBank,
      text: `Net savings this month: ${formatMoney(Math.max(flow.income - flow.expense, 0), currency)}.`,
    },
    {
      icon: Clock,
      text: flow.pending
        ? `${flow.pending} transaction${flow.pending > 1 ? "s are" : " is"} pending.`
        : "No pending transactions right now.",
    },
    { icon: ShieldCheck, text: `Your profile is ${completion}% complete.` },
  ];

  function downloadReceipt(t: Transaction) {
    const body = [
      "velora BANK — TRANSACTION RECEIPT",
      "================================",
      `Reference:   ${t.reference}`,
      `Date:        ${formatDate(t.created_at)}`,
      `Type:        ${txnLabel(t.type)}`,
      `Status:      ${t.status}`,
      `Counterpart: ${t.counterparty_name ?? "—"}`,
      `Description: ${txnDescription(t)}`,
      `Amount:      ${formatMoney(Number(t.amount), t.currency_code)}`,
      "",
      "velora Bank · Electronically generated receipt, valid without signature.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `velora-receipt-${t.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  }

  return (
    <AppShell greetingHeader>
      <div className="space-y-9">
        {!authLoading && !profile && (
          <Panel className="border-destructive/40 bg-destructive/10 text-sm text-destructive">
            Your authenticated account is missing its profile record. Run the velora authentication repair
            migration, then refresh this page.
          </Panel>
        )}
        {/* Cards + balance */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Total balance
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">
                  {accounts.isLoading ? "—" : formatMoney(total, currency)}
                </p>
              </div>
              <select
                value={currency}
                onChange={(e) => setDisplay(e.target.value)}
                className="rounded-2xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
                aria-label="Display currency"
              >
                {(currencies.data ?? [{ code: currency }]).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            {accounts.isLoading ? (
              <Skeleton className="aspect-[1.62/1] w-full max-w-lg rounded-[26px]" />
            ) : list.length ? (
              <div className="space-y-3">
                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:hidden">
                  {list.map((a, i) => (
                    <div key={a.id} className="w-[85%] shrink-0 snap-center">
                      <BankCard account={a} holder={holder} index={i} />
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block">
                  <div className="max-w-lg">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={list[Math.min(cardIndex, list.length - 1)]?.id}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.35 }}
                      >
                        {list[Math.min(cardIndex, list.length - 1)] && (
                          <BankCard
                            account={list[Math.min(cardIndex, list.length - 1)]}
                            holder={holder}
                            index={cardIndex}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    {list.length > 1 && (
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => setCardIndex((i) => (i - 1 + list.length) % list.length)}
                          className="grid size-9 place-items-center rounded-full border border-border hover:border-primary/50"
                          aria-label="Previous card"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          onClick={() => setCardIndex((i) => (i + 1) % list.length)}
                          className="grid size-9 place-items-center rounded-full border border-border hover:border-primary/50"
                          aria-label="Next card"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                        <div className="ml-2 flex gap-1.5">
                          {list.map((a, i) => (
                            <span
                              key={a.id}
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                i === cardIndex ? "w-6 bg-primary" : "w-1.5 bg-border",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Panel className="text-sm text-muted-foreground">
                No accounts yet — a primary account is created automatically at signup.
              </Panel>
            )}
          </div>

          <Panel className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="size-4 text-primary" /> Insights
            </h2>
            <div className="space-y-3">
              {insights.map((i, idx) => {
                const Icon = i.icon;
                return (
                  <motion.div
                    key={i.text}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/40 p-3.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">{i.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </Panel>
        </section>

        {/* Quick actions */}
        <Section title="Quick actions">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {quickActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link to={a.to} className="group flex flex-col items-center gap-2 text-center">
                    <span className="grid size-14 place-items-center rounded-2xl border border-border/70 bg-card/60 text-primary shadow-[0_14px_34px_-26px_var(--primary)] backdrop-blur transition-all group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:bg-primary/10">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                      {a.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* Beneficiaries */}
        <Section
          title="Recent beneficiaries"
          action={
            <Link to="/transfers" className="text-xs font-medium text-primary hover:underline">
              Manage
            </Link>
          }
        >
          {beneficiaries.isLoading ? (
            <div className="flex gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="size-14 rounded-full" />
              ))}
            </div>
          ) : (beneficiaries.data ?? []).length ? (
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              <Link to="/transfers" className="flex w-16 shrink-0 flex-col items-center gap-2">
                <span className="grid size-14 place-items-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary">
                  +
                </span>
                <span className="text-[11px] text-muted-foreground">New</span>
              </Link>
              {(beneficiaries.data ?? []).map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate({ to: "/transfers" })}
                  className="flex w-16 shrink-0 flex-col items-center gap-2"
                >
                  <Avatar url={b.avatar_url} name={b.name} className="size-14 transition-transform hover:scale-105" />
                  <span className="w-full truncate text-[11px] text-muted-foreground">
                    {b.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Panel className="text-sm text-muted-foreground">
              No saved beneficiaries yet.{" "}
              <Link to="/transfers" className="text-primary hover:underline">
                Add your first
              </Link>
              .
            </Panel>
          )}
        </Section>

        {/* Analytics */}
        <Section title="Analytics">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Income vs expenses</h3>
                <span className="text-xs text-muted-foreground">Last 6 months</span>
              </div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={44} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="income" fill="var(--primary)" radius={[8, 8, 0, 0]} animationDuration={900} />
                    <Bar dataKey="expense" fill="var(--primary-glow)" radius={[8, 8, 0, 0]} animationDuration={1100} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel>
              <h3 className="text-sm font-semibold">Savings growth</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="savings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="savings"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#savings)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel>
              <h3 className="text-sm font-semibold">Spending by category</h3>
              {categories.length ? (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        animationDuration={900}
                      >
                        {categories.map((c, i) => (
                          <Cell
                            key={c.name}
                            fill={`color-mix(in oklab, var(--primary) ${95 - i * 13}%, var(--card))`}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 16,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">No spending recorded yet.</p>
              )}
            </Panel>

            <Panel className="lg:col-span-2">
              <h3 className="text-sm font-semibold">Cash flow</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly.map((m) => ({ ...m, net: m.income - m.expense }))}>
                    <defs>
                      <linearGradient id="netflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={44} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="var(--primary-glow)"
                      strokeWidth={2.5}
                      fill="url(#netflow)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </Section>

        {/* Transactions */}
        <Section
          title="Recent transactions"
          action={
            <Link to="/statements" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          <Panel>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface/50 px-3.5 py-2.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search transactions"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <div className="flex gap-1.5 overflow-x-auto">
                {(["all", "in", "out", "pending"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setPage(0);
                    }}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium capitalize transition-colors",
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f === "in" ? "Money in" : f === "out" ? "Money out" : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/60">
              {transactions.isLoading &&
                [0, 1, 2, 3].map((i) => <Skeleton key={i} className="my-3 h-12 w-full" />)}

              {!transactions.isLoading &&
                pageRows.map((t, i) => {
                  const incoming = Number(t.amount) >= 0;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 py-3.5"
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-2xl",
                          incoming ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/12 text-primary",
                        )}
                      >
                        {incoming ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.counterparty_name || txnDescription(t)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span>{txnLabel(t.type)}</span> · {formatDate(t.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatMoney(Number(t.amount), t.currency_code)}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] capitalize",
                            t.status === "completed"
                              ? "text-emerald-500"
                              : t.status === "pending"
                                ? "text-amber-500"
                                : "text-muted-foreground",
                          )}
                        >
                          {t.status === "completed" ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <Clock className="size-3" />
                          )}
                          {t.status}
                        </span>
                      </div>
                      <button
                        onClick={() => downloadReceipt(t)}
                        aria-label="Download receipt"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <Receipt className="size-4" />
                      </button>
                    </motion.div>
                  );
                })}

              {!transactions.isLoading && !filtered.length && (
                <div className="py-10 text-center">
                  <Banknote className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">No transactions match your filters.</p>
                </div>
              )}
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="grid size-9 place-items-center rounded-full border border-border disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                    disabled={page >= pages - 1}
                    className="grid size-9 place-items-center rounded-full border border-border disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </Section>

        {/* Accounts overview + security */}
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Section title="Account overview">
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((a) => {
                const recent = txns.filter((t) => t.account_id === a.id).slice(0, 3);
                return (
                  <Panel key={a.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {a.label}
                      </p>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-primary">
                        {a.type}
                      </span>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatMoney(Number(a.balance), a.currency_code)}
                    </p>
                    <div className="space-y-1.5 border-t border-border/60 pt-3">
                      {recent.length ? (
                        recent.map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate text-muted-foreground">
                              {t.counterparty_name || txnDescription(t)}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {formatMoney(Number(t.amount), t.currency_code)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No recent activity.</p>
                      )}
                    </div>
                  </Panel>
                );
              })}
              {!list.length && !accounts.isLoading && (
                <Panel className="sm:col-span-2 text-sm text-muted-foreground">No accounts yet.</Panel>
              )}
            </div>
          </Section>

          <div className="space-y-6">
            <Panel className="space-y-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="size-4 text-primary" /> Security
              </h2>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Profile completion</span>
                  <span className="text-foreground">{completion}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                  />
                </div>
              </div>
              <dl className="space-y-2.5 text-sm">
                <Row label="Email verified" value={profile?.email ? "Verified" : "Pending"} good={Boolean(profile?.email)} />
                <Row label="Password" value="Strong · rotate every 90 days" good />
                <Row label="KYC status" value={profile?.kyc_status ?? "—"} good={profile?.kyc_status === "verified"} />
                <Row
                  label="Last activity"
                  value={txns[0] ? formatDate(txns[0].created_at) : "No activity yet"}
                  good
                />
              </dl>
              {completion < 100 && (
                <Link
                  to="/profile"
                  className="block rounded-2xl border border-primary/40 bg-primary/8 p-3 text-xs text-muted-foreground transition-colors hover:bg-primary/12"
                >
                  Recommendation: complete your profile details to secure your account.
                </Link>
              )}
            </Panel>

            <Panel>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Megaphone className="size-4 text-primary" /> Announcements
              </h2>
              <div className="mt-4 space-y-3">
                {(announcements.data ?? []).filter((a) => !(dismissedAnnouncements.data ?? []).includes(a.id)).map((a) => (
                  <div key={a.id} className="rounded-2xl border border-border/60 bg-surface/40 p-4">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
                  </div>
                ))}
                {!(announcements.data ?? []).filter((a) => !(dismissedAnnouncements.data ?? []).includes(a.id)).length && (
                  <p className="text-sm text-muted-foreground">Nothing to report.</p>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Bell className="size-4 text-primary" /> Notifications
                </h2>
                <Link to="/notifications" className="text-xs text-primary hover:underline">
                  Open center
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {(notifications.data ?? []).slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface/40 p-4"
                  >
                    {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{notificationText(n.title)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notificationText(n.body)}</p>
                    </div>
                  </div>
                ))}
                {!(notifications.data ?? []).length && (
                  <p className="text-sm text-muted-foreground">You're all caught up.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-xs font-medium capitalize", good ? "text-emerald-500" : "text-amber-500")}>
        {value}
      </dd>
    </div>
  );
}
