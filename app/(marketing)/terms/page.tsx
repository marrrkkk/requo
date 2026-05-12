import type { Metadata } from "next";

import { StructuredData } from "@/components/seo/structured-data";
import { TermsOfServicePage } from "@/features/legal/components/terms-of-service-page";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "The Requo Terms of Service cover public pages, businesses, user content, AI-assisted features, and liability limits for service businesses using Requo.",
  pathname: "/terms",
  title: "Terms of Service",
});

export default function TermsPage() {
  const breadcrumbItems = buildBreadcrumbsForPathname("/terms", {
    "/terms": "Terms of Service",
  });
  const breadcrumbStructuredData = breadcrumbItems.length
    ? getBreadcrumbListStructuredData({
        items: breadcrumbItems.map((item) => ({
          ...item,
          url: absoluteUrl(item.url),
        })),
      })
    : null;

  return (
    <>
      {breadcrumbStructuredData ? (
        <StructuredData
          data={breadcrumbStructuredData}
          id="breadcrumb-structured-data"
        />
      ) : null}
      <TermsOfServicePage />
    </>
  );
}
