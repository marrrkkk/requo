import type { Metadata } from "next";

import { faqItems } from "@/components/marketing/marketing-data";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { StructuredData } from "@/components/seo/structured-data";
import {
  getFaqPageStructuredData,
  getSoftwareApplicationStructuredData,
} from "@/lib/seo/structured-data";
import {
  createPageMetadata,
  getSiteOrigin,
  siteName,
} from "@/lib/seo/site";

const marketingDescription =
  "Requo is quote software for owner-led service businesses. Capture inquiries, send professional quotes, follow up, and track accepted and rejected deals.";

export const metadata: Metadata = createPageMetadata({
  absoluteTitle: "Requo — Manage inquiries, send quotes, follow up",
  description: marketingDescription,
  pathname: "/",
});

export default function MarketingPage() {
  const softwareApplicationStructuredData = getSoftwareApplicationStructuredData(
    {
      description: marketingDescription,
      name: siteName,
      url: getSiteOrigin(),
    },
  );
  const faqPageStructuredData = getFaqPageStructuredData({
    items: faqItems,
  });

  return (
    <>
      <StructuredData
        data={softwareApplicationStructuredData}
        id="requo-software-application-structured-data"
      />
      <StructuredData
        data={faqPageStructuredData}
        id="requo-faq-page-structured-data"
      />
      <MarketingHero />
    </>
  );
}
