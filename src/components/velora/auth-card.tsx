import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { veloraLogo } from "@/components/velora/logo";

export const authInput =
  "w-full rounded-2xl border border-border bg-surface/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/60";

export function AuthCard({
  title,
  description,
  children,
  footer,
  back = true,
  badge,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
  badge?: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-[2rem] border border-border/70 bg-card/70 p-6 backdrop-blur-2xl sm:p-8"
      >
        {back && (
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to velora.bank
          </Link>
        )}

        <div className="flex items-center justify-between gap-3">
          <veloraLogo />
          {badge && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              {badge}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-7">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          Protected by 256-bit encryption. velora will never ask for your password.
        </p>
      </motion.div>
    </main>
  );
}

/** Password field with a show/hide eye toggle. */
export function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
  minLength = 6,
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        className={authInput + " pr-12"}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
