import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import {
  faqItems,
  landingFeatureItems,
  workflowSteps,
} from "@/components/marketing/marketing-data";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import { StructuredData } from "@/components/seo/structured-data";
import {
  getFaqPageStructuredData,
  getHowToStructuredData,
  getSoftwareApplicationStructuredData,
} from "@/lib/seo/structured-data";
import {
  absoluteUrl,
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

export default async function MarketingPage() {
  "use cache";
  cacheLife("hours");
  const softwareApplicationStructuredData = getSoftwareApplicationStructuredData(
    {
      description: marketingDescription,
      featureList: landingFeatureItems.map((item) => item.title),
      name: siteName,
      offers: {
        price: 0,
        priceCurrency: "USD",
        url: absoluteUrl("/pricing"),
      },
      url: getSiteOrigin(),
    },
  );
  const faqPageStructuredData = getFaqPageStructuredData({
    items: faqItems,
  });
  const howToStructuredData = getHowToStructuredData({
    name: "How to send a quote with Requo",
    description:
      "Capture an inquiry, draft a quote with AI, send it to your customer, and track the response.",
    steps: workflowSteps.map((step) => ({
      name: step.title,
      text: step.description,
    })),
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
      <StructuredData
        data={howToStructuredData}
        id="requo-how-to-structured-data"
      />
      <MarketingHero />
    </>
  );
}
