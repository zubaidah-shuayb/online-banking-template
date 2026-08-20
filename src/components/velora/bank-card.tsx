import { motion } from "motion/react";
import { Wifi } from "lucide-react";
import { formatMoney, type Account } from "@/integrations/velora/types";
import { cn } from "@/lib/utils";

function VELORAMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 5.5 12 19l8-13.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


const gradients = [
  "from-primary via-primary-glow to-primary",
  "from-[oklch(0.32_0.08_264)] via-primary to-primary-glow",
  "from-primary-glow via-primary to-[oklch(0.28_0.07_264)]",
];

export function BankCard({
  account,
  holder,
  index = 0,
  className,
}: {
  account: Account;
  holder: string;
  index?: number;
  className?: string;
}) {
  const last4 = account.account_number.slice(-4);
  const expiry = new Date(account.created_at);
  expiry.setFullYear(expiry.getFullYear() + 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className={cn(
        "relative aspect-[1.62/1] w-full overflow-hidden rounded-[26px] p-5 text-primary-foreground shadow-[0_28px_60px_-30px_var(--primary)] sm:p-6",
        "bg-gradient-to-br",
        gradients[index % gradients.length],
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-52 rounded-full bg-black/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_55%)]" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <VELORAMark className="size-7" />
            <span className="text-sm font-semibold tracking-[0.18em] uppercase">VELORA</span>
          </div>
          <Wifi className="size-5 rotate-90 opacity-80" />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] opacity-75">
            {account.label} · {account.type}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
            {formatMoney(Number(account.balance), account.currency_code)}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm tracking-[0.18em] opacity-90">•••• •••• •••• {last4}</p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] opacity-80">
              {holder}
            </p>
          </div>
          <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.14em] opacity-80">
            <p>Exp</p>
            <p className="font-mono text-xs">
              {String(expiry.getMonth() + 1).padStart(2, "0")}/{String(expiry.getFullYear()).slice(-2)}
            </p>
            <p className="mt-1">{account.currency_code}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
