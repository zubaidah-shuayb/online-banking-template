import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Github, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/velora/client";

import { Textarea } from "@/components/ui/textarea";
import { veloraLogo } from "./logo";
import { btn, Reveal, SectionHeading } from "./ui";

const DETAILS = [
  { icon: Mail, label: "Support", value: "support@velorabank.com" },
  { icon: Phone, label: "Phone", value: "+1 (555) 0142" },
  { icon: MapPin, label: "Office", value: "18 Harbour Row, Central District" },
  { icon: Clock, label: "Hours", value: "Monday – Friday, 09:00 – 18:00" },
];

export function Contact() {
  return (
    <section id="contact" className="relative py-16 sm:py-20 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Contact"
            title={<>Talk to the velora team</>}
            description="Questions about your account, our products, or getting started with velora — our team replies quickly."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {DETAILS.map((d, i) => (
              <Reveal key={d.label} delay={i * 0.06}>
                <div className="rounded-2xl border border-border bg-surface/40 p-5">
                  <d.icon className="h-4.5 w-4.5 text-primary-glow" />
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {d.label}
                  </p>
                  <p className="mt-1 text-sm">{d.value}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.15}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const fd = new FormData(form);
              void (async () => {
                const { error } = await supabase.from("contact_messages").insert({
                  name: String(fd.get("name") ?? ""),
                  email: String(fd.get("email") ?? ""),
                  subject: String(fd.get("subject") ?? ""),
                  message: String(fd.get("message") ?? ""),
                });
                if (error) {
                  toast.error("Message could not be sent", { description: error.message });
                  return;
                }
                toast.success("Message received", {
                  description: "Our team will get back to you shortly.",
                });
                form.reset();
              })();
            }}

            className="rounded-3xl border border-border bg-surface/50 p-7 backdrop-blur elevated"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground" htmlFor="name">Full name</label>
                <Input id="name" name="name" required maxLength={100} placeholder="John Doe" className="h-11 rounded-xl bg-surface-2/60" />
              </div>
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground" htmlFor="email">Email</label>
                <Input id="email" name="email" type="email" required maxLength={255} placeholder="john@company.com" className="h-11 rounded-xl bg-surface-2/60" />
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="subject">Subject</label>
              <Input id="subject" name="subject" required maxLength={120} placeholder="Account opening" className="h-11 rounded-xl bg-surface-2/60" />
            </div>
            <div className="mt-4 grid gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="message">Message</label>
              <Textarea id="message" name="message" required maxLength={1000} rows={5} placeholder="Tell us what you'd like to see." className="rounded-xl bg-surface-2/60" />
            </div>
            <button type="submit" className={`${btn({ size: "lg" })} mt-6 w-full`}>
              Send message <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <section className="relative px-4 py-10 sm:px-6 sm:py-12">
      <Reveal>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-surface/50 p-6 text-center sm:rounded-[2rem] sm:p-10 backdrop-blur elevated md:p-14">
          <div className="aurora pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative">
            <h2 className="text-balance text-2xl font-semibold sm:text-3xl md:text-4xl">
              Product notes, straight from velora
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Occasional updates on new products, features and rates.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("You're subscribed", { description: "Look out for velora updates in your inbox." });
                setEmail("");
              }}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <Input
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email address"
                className="h-12 rounded-full bg-surface-2/70 px-5"
              />
              <button type="submit" className={btn({ size: "lg" })}>
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const FOOTER = [
  { title: "Quick Links", links: ["Home", "Features", "Security", "FAQ"] },
  { title: "Support", links: ["Help Centre", "Contact", "Status", "Guides"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Disclaimer"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <veloraLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Modern Banking. Timeless Trust. Premium multi-currency accounts, instant transfers,
              financial institutions.
            </p>
            <div className="mt-5 flex gap-2">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <span
                  key={i}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link to="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} velora Bank. All rights reserved.</p>
          <p>Member velora Group. Deposits protected up to $250,000.</p>
        </div>
      </div>
    </footer>
  );
}
