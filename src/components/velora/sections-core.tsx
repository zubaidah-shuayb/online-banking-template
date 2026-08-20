import {
  Activity,
  Bell,
  CreditCard,
  FileText,
  Gauge,
  Globe2,
  Lock,
  Zap,
  ShieldCheck,
  Fingerprint,
  Eye,
  BadgeCheck,
  KeyRound,
} from "lucide-react";
import { motion } from "motion/react";
import { Reveal, SectionHeading } from "./ui";

const FEATURES = [
  { icon: Globe2, title: "Multi-Currency Accounts", copy: "Hold and switch between 25+ currencies with live formatting." },
  { icon: Zap, title: "Fast Transfers", copy: "Move funds between accounts and beneficiaries in a single confirmation." },
  { icon: Bell, title: "Real-Time Notifications", copy: "Deposit, withdrawal, transfer and security alerts as they happen." },
  { icon: Gauge, title: "Professional Dashboard", copy: "Balances, charts and activity in one calm, elegant overview." },
  { icon: FileText, title: "Statements", copy: "Download polished statements for 30 days, 90 days or a custom range." },
  { icon: Activity, title: "Transaction History", copy: "Filterable ledger with types, statuses and downloadable receipts." },
  { icon: Lock, title: "Secure Accounts", copy: "Role-based access, session timeout and full activity monitoring." },
  { icon: CreditCard, title: "Virtual Cards", copy: "Beautiful virtual cards tied to checking and savings accounts." },
];

const SECURITY = [
  { icon: KeyRound, title: "Secure Login", copy: "Email and password authentication with strict session handling." },
  { icon: ShieldCheck, title: "Session Protection", copy: "Automatic timeout after inactivity keeps accounts closed." },
  { icon: Eye, title: "Activity Monitoring", copy: "Every admin and account action is written to an audit log." },
  { icon: BadgeCheck, title: "Account Verification", copy: "Verified customer badges signal reviewed profiles." },
  { icon: Fingerprint, title: "Encrypted Data", copy: "Records are protected by row-level access rules end to end." },
];

const STATS = [
  { value: "25+", label: "Currencies" },
  { value: "10", label: "Transaction types" },
  { value: "4", label: "Bank skins" },
  { value: "99.9%", label: "Platform uptime" },
];

export function Features() {
  return (
    <section id="features" className="relative py-16 sm:py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Platform"
          title={<>Everything a modern bank ships</>}
          description="A complete banking surface — accounts, movement of money, documents and alerts — designed with the restraint of the world's best fintech products."
        />

        <div className="mt-10 grid sm:mt-14 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group h-full rounded-3xl border border-border bg-surface/50 p-6 backdrop-blur transition-colors hover:border-primary/40"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary-glow/10 text-primary-glow ring-1 ring-primary/25">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Showcase() {
  return (
    <section id="about" className="relative py-16 sm:py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Dashboard"
          title={<>A control centre customers trust</>}
          description="Checking and savings balances, spending charts, recent activity and quick actions — all responsive, all skinned by the administrator."
        />

        <Reveal delay={0.1}>
          <div className="mt-10 rounded sm:mt-14-[2rem] border border-border bg-surface/40 p-3 backdrop-blur elevated sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground sm:p-6">
                <p className="text-xs uppercase tracking-[0.18em] opacity-80">Checking</p>
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums sm:text-3xl">$24,560.75</p>
                <p className="mt-1 text-xs opacity-80">•••• 4532 · USD</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-2/70 p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Savings</p>
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums sm:text-3xl">$112,940.00</p>
                <p className="mt-1 text-xs text-muted-foreground">Interest paid monthly</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-2/70 p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">This month</p>
                <div className="mt-4 flex h-16 items-end gap-1.5">
                  {[34, 52, 41, 68, 47, 82, 61, 94, 72, 88].map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 rounded-full bg-gradient-to-t from-primary/40 to-primary-glow"
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">+12.5% vs last month</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.08}>
                  <div className="rounded-3xl border border-border bg-surface-2/50 p-5 text-center">
                    <p className="font-display text-2xl font-semibold tabular-nums">{s.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Security() {
  return (
    <section id="security" className="relative py-16 sm:py-20 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:gap-14 lg:grid-cols-2">
        <Reveal>
          <div className="relative mx-auto grid aspect-square w-full max-w-xs place-items-center sm:max-w-md">
            <div className="aurora absolute inset-0 rounded-full opacity-60 blur-2xl" />
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="relative grid h-40 w-40 sm:h-56 sm:w-56 place-items-center rounded-[3rem] border border-border bg-surface/60 backdrop-blur glow-ring"
            >
              <ShieldCheck className="h-16 w-16 text-primary-glow sm:h-24 sm:w-24" strokeWidth={1.2} />
            </motion.div>
            {[0, 1, 2].map((r) => (
              <motion.span
                key={r}
                className="absolute rounded-full border border-primary/20"
                style={{ width: `${55 + r * 15}%`, height: `${55 + r * 15}%` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 30 + r * 12, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </div>
        </Reveal>

        <div>
          <SectionHeading
            align="left"
            eyebrow="Security"
            title={<>Protection built into every layer</>}
            description="VELORA treats your money with absolute discipline — strict access rules, monitored sessions and a complete audit trail."
          />
          <div className="mt-10 grid gap-3">
            {SECURITY.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface/40 p-4 transition-colors hover:border-primary/40">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary-glow">
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
