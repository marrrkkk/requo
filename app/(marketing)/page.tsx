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
  "Quote software for owner-led service businesses. Capture inquiries, send professional quotes, follow up automatically, and track every deal from viewed to accepted.";

export const metadata: Metadata = {
  ...createPageMetadata({
    absoluteTitle: "Requo | Quote Software for Service Businesses",
    description: marketingDescription,
    pathname: "/",
  }),
  keywords: [
    "quote software",
    "quotation software",
    "estimate software",
    "proposal software",
    "service business software",
    "contractor software",
    "freelancer tools",
    "inquiry management",
    "quote tracking",
    "follow-up automation",
  ],
};

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
