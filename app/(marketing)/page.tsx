import type { Metadata } from "next";

import { MarketingHero } from "@/components/marketing/marketing-hero";
import { StructuredData } from "@/components/seo/structured-data";
import { getSoftwareApplicationStructuredData } from "@/lib/seo/structured-data";
import {
  createPageMetadata,
  getSiteOrigin,
  siteDescription,
  siteName,
} from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  description: siteDescription,
  pathname: "/",
  title: "Quote software for service businesses",
});

export default function MarketingPage() {
  const softwareApplicationStructuredData = getSoftwareApplicationStructuredData(
    {
      description: siteDescription,
      name: siteName,
      url: getSiteOrigin(),
    },
  );

  return (
    <>
      <StructuredData
        data={softwareApplicationStructuredData}
        id="requo-software-application-structured-data"
      />
      <MarketingHero />
    </>
  );
}
