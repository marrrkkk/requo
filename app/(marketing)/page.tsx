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
  "Turn inquiries into quotes before they go cold. Built for owner-led service businesses that prepare custom quotes. Capture every request, respond faster, follow up automatically.";

export const metadata: Metadata = {
  ...createPageMetadata({
    absoluteTitle: "Requo | Never Lose the Next Step",
    description: marketingDescription,
    pathname: "/",
  }),
  keywords: [
    "quote software",
    "quotation software",
    "estimate software",
    "proposal software",
    "service business software",
    "inquiry management",
    "quote tracking",
    "follow-up software",
    "custom quote software",
    "inquiry to quote",
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
