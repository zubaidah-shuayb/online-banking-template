import { Award, Gem, HeartHandshake, LineChart, Palette, Users } from "lucide-react";
import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, SectionHeading } from "./ui";

const CURRENCIES = [
  ["USD", "$"], ["EUR", "€"], ["GBP", "£"], ["NGN", "₦"], ["CAD", "$"], ["AUD", "$"],
  ["AED", "د.إ"], ["JPY", "¥"], ["CHF", "Fr"], ["SAR", "﷼"], ["ZAR", "R"], ["INR", "₹"],
  ["CNY", "¥"], ["KES", "KSh"], ["GHS", "₵"], ["BRL", "R$"], ["MXN", "$"], ["SEK", "kr"],
  ["NOK", "kr"], ["DKK", "kr"], ["SGD", "$"], ["HKD", "$"], ["NZD", "$"], ["TRY", "₺"],
  ["PLN", "zł"], ["EGP", "£"],
];

const WHY = [
  { icon: Gem, title: "Luxury by default", copy: "Every screen is composed with generous space, soft depth and typography that reads like a private bank." },
  { icon: Palette, title: "Four bank skins", copy: "Classic Blue, Emerald, Midnight and Royal Indigo restyle the entire platform instantly." },
  { icon: LineChart, title: "Live-feeling data", copy: "Charts, balances and activity update the moment an administrator posts a movement." },
  { icon: Users, title: "Two clear roles", copy: "Customers see only their own records; Then the supposrt system can help be for flexibility." },
  { icon: Award, title: "Receipts on everything", copy: "Each transaction produces a professional, shareable receipt automatically." },
  { icon: HeartHandshake, title: "Human support", copy: "Real people, 24/7 — no phone trees, no scripts, no waiting on hold." },
];

const FAQS = [
  { q: "What is VELORA Bank?", a: "VELORA Bank is a premium digital bank: multi-currency accounts, instant transfers, virtual cards, statements and receipts — all in one beautifully designed platform." },
  { q: "How do balances work?", a: "New customers start with a checking and savings balance of zero." },
  { q: "Which currencies are supported?", a: "More than 25 currencies including USD, EUR, GBP, NGN, CAD, AUD, AED, JPY, CHF, SAR, ZAR and INR. Customerscan enable, disable and assign currencies per customer." },
  { q: "Can I change how the platform looks?", a: "Customers can pick a bank skin depending on their preference and the entire platform restyles instantly." },
  { q: "Can customers download statements?", a: "Yes. Statements can be generated for the last 30 days, 90 days or a custom date range, and every transaction carries its own receipt." },
  { q: "How is my session protected?", a: "Sessions time out automatically after inactivity, access is role based, and every administrative action is written to an audit log." },
];

export function Currencies() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Global"
          title={<>Money in the currency your customers think in</>}
          description="Assign a preferred currency to every customer. Balances, statements and receipts follow automatically."
        />
      </div>

      <div className="relative mt-14 space-y-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r sm:w-24 from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l sm:w-24 from-background to-transparent" />
        {[0, 1].map((row) => (
          <div key={row} className="flex overflow-hidden">
            <motion.div
              className="flex shrink-0 gap-3 pr-3"
              animate={{ x: row === 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
              transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
            >
              {[...CURRENCIES, ...CURRENCIES].map(([code, symbol], i) => (
                <div
                  key={`${row}-${code}-${i}`}
                  className="flex min-w-[8rem] items-center gap-2.5 rounded-2xl border border-border bg-surface/50 px-4 py-3 sm:min-w-[9.5rem] sm:gap-3 sm:px-5 sm:py-4 backdrop-blur"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-sm text-primary-glow">
                    {symbol}
                  </span>
                  <span className="text-sm font-medium tracking-wide">{code}</span>
                </div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WhyVELORA() {
  return (
    <section className="relative py-16 sm:py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why VELORA"
          title={<>Designed like a flagship product</>}
        />
        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.06}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface/50 p-6 backdrop-blur sm:p-7"
              >
                <div className="aurora absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-40" />
                <div className="relative">
                  <w.icon className="h-6 w-6 text-primary-glow" strokeWidth={1.6} />
                  <h3 className="mt-5 text-lg font-semibold">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.copy}</p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="relative py-16 sm:py-20 md:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title={<>Questions, answered</>} />
        <Reveal delay={0.1}>
          <Accordion type="single" collapsible className="mt-12 space-y-3">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-2xl border border-border bg-surface/50 px-4 backdrop-blur sm:px-5"
              >
                <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
