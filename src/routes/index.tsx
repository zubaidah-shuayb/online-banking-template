import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/velora/nav";
import { Hero } from "@/components/velora/hero";
import { Features, Showcase, Security } from "@/components/velora/sections-core";
import { Currencies, Whyvelora, Faq } from "@/components/velora/sections-more";
import { Contact, Newsletter, Footer } from "@/components/velora/sections-contact";

const TITLE = "velora Bank — Modern Banking. Timeless Trust.";
const DESCRIPTION =
  "velora Bank is premium digital banking: multi-currency accounts, instant transfers, statements, receipts and virtual cards in one elegant platform.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <LandingNav />
      <Hero />
      <Features />
      <Showcase />
      <Security />
      <Currencies />
      <Whyvelora />
      <Faq />
      <Contact />
      <Newsletter />
      <Footer />
    </main>
  );
}
