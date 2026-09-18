import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { EditorialPage } from "@/components/marketing/editorial-page";
import { InViewReveal } from "@/components/marketing/in-view-reveal";
import { StructuredData } from "@/components/seo/structured-data";
import { legalConfig } from "@/features/legal/config";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  getBreadcrumbListStructuredData,
  getFaqPageStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "What Requo is: quote and inquiry management software for service businesses, built in Lucena City, Philippines. See who it fits, how it works, and how to reach us.",
  pathname: "/about",
  title: "About Requo",
});

const aboutFaqs = [
  {
    question: "What is Requo?",
    answer:
      "Requo is quote and inquiry management software for service businesses. Capture requests, draft professional quotes, share them by link or email, track viewed and accepted status, follow up before opportunities go cold, and convert accepted quotes into invoices with manual payments.",
  },
  {
    question: "Who is Requo for?",
    answer:
      "Service businesses that receive custom inquiries and prepare custom-scope quotes — contractors, consultants, creatives, event producers, cleaning and outdoor crews, and print shops. If customers ask for pricing before committing, Requo fits.",
  },
  {
    question: "What is Requo not?",
    answer:
      "Requo is not job-scheduling or dispatch software, and it does not process online payments. It covers the commercial loop — inquiry to quote to follow-up to invoice — and records manual payments honestly.",
  },
  {
    question: "How do I contact Requo?",
    answer:
      "For product support, write to support@requo.app. For privacy questions, write to privacy@requo.app.",
  },
] as const;

export default async function AboutPage() {
  "use cache";
  cacheLife("hours");

  const breadcrumbStructuredData = getBreadcrumbListStructuredData({
    items: [
      { name: "Home", url: absoluteUrl("/") },
      { name: "About", url: absoluteUrl("/about") },
    ],
  });
  const faqStructuredData = getFaqPageStructuredData({ items: [...aboutFaqs] });

  return (
    <>
      <StructuredData
        data={breadcrumbStructuredData}
        id="about-breadcrumb-structured-data"
      />
      <StructuredData
        data={faqStructuredData}
        id="about-faq-structured-data"
      />
      <EditorialPage
        breadcrumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        ctaHeadline="Try the loop on your next inquiry."
        ctaSub="Capture it, quote it, follow it to paid."
        definition="Requo is quote and inquiry management software for service businesses: every request gets a clear next step, every quote gets tracked to a decision, and every accepted quote becomes an invoice. It is built and operated from Lucena City, Philippines, for owners who sell custom work."
        eyebrow="About"
        faqSlug="about"
        faqs={[...aboutFaqs]}
        secondaryCta={{ href: "/solutions", label: "Browse solutions" }}
        title="What is Requo?"
      >
        <section
          aria-label="About Requo"
          className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:px-0"
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <InViewReveal>
              <div className="soft-panel flex h-full flex-col gap-2.5">
                <h2 className="font-heading text-base font-semibold tracking-tight">
                  Who it fits
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Businesses that quote custom scope — remodels, engagements,
                  events, cleanings, custom orders. Appointment-first shops
                  with fixed menus are not the primary fit.
                </p>
              </div>
            </InViewReveal>
            <InViewReveal delay={80}>
              <div className="soft-panel flex h-full flex-col gap-2.5">
                <h2 className="font-heading text-base font-semibold tracking-tight">
                  Where we are
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {legalConfig.address}. Support: {legalConfig.supportEmail}.
                  Privacy: {legalConfig.privacyEmail}.
                </p>
              </div>
            </InViewReveal>
            <InViewReveal delay={120}>
              <div className="soft-panel flex h-full flex-col gap-2.5">
                <h2 className="font-heading text-base font-semibold tracking-tight">
                  How we handle trust
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Read how Requo protects data, what subprocessors are
                  involved, and the terms that govern the service.
                </p>
                <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm font-medium text-primary">
                  <Link className="hover:underline" href="/security">
                    Security
                  </Link>
                  <Link className="hover:underline" href="/privacy">
                    Privacy
                  </Link>
                  <Link className="hover:underline" href="/terms">
                    Terms
                  </Link>
                </p>
              </div>
            </InViewReveal>
          </div>
        </section>
      </EditorialPage>
    </>
  );
}
