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
  "Quote software for service businesses. Capture inquiries, send clear quotes, track views and follow-ups from one hub. Free to start.";

export const metadata: Metadata = createPageMetadata({
  description: marketingDescription,
  pathname: "/",
  title: "Quote software for service businesses",
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
