import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { VELORALogo } from "./logo";
import { SkinSwitcher } from "./skin-switcher";
import { btn } from "./ui";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
  { label: "About", href: "#about" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4"
    >
      <nav
        className={`mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-full px-3 py-2 transition-all duration-500 sm:px-5 sm:py-2.5 lg:flex lg:justify-between ${
          scrolled ? "glass elevated" : "border border-transparent"
        }`}
      >
        <a href="#home" className="min-w-0 shrink-0">
          <VELORALogo />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground xl:px-3.5"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <SkinSwitcher />
          </div>
          <div className="hidden sm:block">
            <Link to="/login" className={btn({ variant: "ghost", size: "sm" })}>
              Sign In
            </Link>
          </div>
          <div className="hidden md:block">
            <Link to="/register" className={btn({ size: "sm" })}>
              Open Account
            </Link>
          </div>

          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-foreground lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>


      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass elevated mx-auto mt-2 max-h-[70vh] max-w-6xl overflow-y-auto rounded-3xl p-3 sm:p-4 lg:hidden"
        >
          <ul className="grid gap-1 sm:grid-cols-2">
            {LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 border-t border-border pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:hidden">
                <Link to="/login" onClick={() => setOpen(false)} className={`${btn({ variant: "ghost" })} w-full`}>
                  Sign In
                </Link>
              </div>
              <div className="md:hidden">
                <Link to="/register" onClick={() => setOpen(false)} className={`${btn()} w-full`}>
                  Open Account
                </Link>
              </div>
            </div>
            <div className="flex justify-center pt-1 md:hidden">
              <SkinSwitcher />
            </div>
          </div>

        </motion.div>
      )}

    </motion.header>
  );
}
