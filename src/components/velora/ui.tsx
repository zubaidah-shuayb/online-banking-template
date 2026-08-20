import { cva } from "class-variance-authority";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export const btn = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-[0_18px_40px_-18px_var(--primary)] hover:brightness-110 hover:-translate-y-0.5",
        ghost:
          "border border-border bg-surface/40 text-foreground backdrop-blur hover:border-primary/50 hover:bg-surface",
        subtle: "text-muted-foreground hover:text-foreground",
      },
      size: {
        sm: "h-9 px-3.5 text-sm sm:px-4",
        md: "h-11 px-5 text-sm sm:px-6",
        lg: "h-12 px-6 text-sm sm:h-13 sm:px-8 sm:text-base",
      },

    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center rounded-full border border-border bg-surface/50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-balance text-[1.75rem] font-semibold leading-[1.12] sm:mt-5 sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">{description}</p>
      )}

    </Reveal>
  );
}
