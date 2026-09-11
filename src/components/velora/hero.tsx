import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import laptop from "@/assets/device-laptop.png";
import phone from "@/assets/device-phone.png";
import { btn } from "./ui";

const PARTICLES = [
  { left: "12%", top: "22%", d: 0 },
  { left: "28%", top: "68%", d: 1.2 },
  { left: "44%", top: "14%", d: 2.1 },
  { left: "62%", top: "52%", d: 0.6 },
  { left: "78%", top: "28%", d: 1.7 },
  { left: "88%", top: "72%", d: 2.6 },
  { left: "8%", top: "82%", d: 3.1 },
  { left: "54%", top: "86%", d: 2.3 },
];

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden pb-20 pt-28 sm:pt-32 md:pb-32 md:pt-44">
      <div className="aurora pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-primary-glow/70"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [0, -22, 0], opacity: [0.15, 0.8, 0.15] }}
            transition={{ duration: 6 + p.d, repeat: Infinity, ease: "easeInOut", delay: p.d }}
          />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:gap-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground backdrop-blur sm:px-3.5 sm:text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-glow" />
            <span className="text-left">Trusted by 240,000+ customers worldwide</span>
          </motion.span>


          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-balance text-[2.5rem] font-semibold leading-[1.02] sm:mt-6 sm:text-6xl lg:text-7xl"
          >
            Modern Banking.
            <br />
            <span className="gradient-text">Timeless Trust.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg lg:mx-0"
          >
            velora Bank is premium digital banking — multi-currency accounts, instant
            transfers, statements and round-the-clock control. Built for the people,
             with the polish of a global digital bank.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.24 }}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-start"
          >
            <Link to="/register" className={`${btn({ size: "lg" })} w-full sm:w-auto`}>
              Open Account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className={`${btn({ variant: "ghost", size: "lg" })} w-full sm:w-auto`}>
              Sign In
            </Link>
          </motion.div>


          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:gap-x-6 sm:text-sm lg:mt-10 lg:justify-start"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-glow" /> Session protected
            </span>
            <span className="h-4 w-px bg-border" />
            <span>25+ currencies</span>
            <span className="h-4 w-px bg-border" />
            <span>Admin control centre</span>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <motion.img
              src={laptop}
              alt="velora Bank customer dashboard on a laptop"
              width={1200}
              height={848}
              className="w-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.5)] sm:drop-shadow-[0_50px_80px_rgba(0,0,0,0.55)]"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src={phone}
              alt="velora Bank mobile app"
              width={640}
              height={1280}
              loading="lazy"
              className="absolute -bottom-6 -left-2 w-[26%] drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)] sm:-bottom-10 sm:-left-6 sm:w-[30%]"
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </motion.div>
        </div>

      </div>
    </section>
  );
}
