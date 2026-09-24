import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import { EditorialPage } from "@/components/marketing/editorial-page";
import { StructuredData } from "@/components/seo/structured-data";
import { createPageMetadata } from "@/lib/seo/site";
import { getFaqPageStructuredData } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "What Requo is: quote and inquiry management software for service businesses. See who it fits, how it works, and how to reach us.",
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

  const faqStructuredData = getFaqPageStructuredData({ items: [...aboutFaqs] });

  return (
    <>
      <StructuredData
        data={faqStructuredData}
        id="about-faq-structured-data"
      />
      <EditorialPage
        ctaHeadline="Try the loop on your next inquiry."
        ctaSub="Capture it, quote it, follow it to paid."
        definition="Requo is quote and inquiry management software for service businesses: every request gets a clear next step, every quote gets tracked to a decision, and every accepted quote becomes an invoice — for owners who sell custom work."
        eyebrow="About"
        faqSlug="about"
        faqs={[...aboutFaqs]}
        secondaryCta={{ href: "/solutions", label: "Browse solutions" }}
        title="What is Requo?"
      />
    </>
  );
}
