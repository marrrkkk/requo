import type { Metadata } from "next";

import { StructuredData } from "@/components/seo/structured-data";
import { RefundPolicyPage } from "@/features/legal/components/refund-policy-page";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "The Requo Refund Policy explains refund eligibility, subscription cancellation, and payment provider notes for owner-led service businesses using Requo.",
  pathname: "/refund-policy",
  title: "Refund Policy",
});

export default function RefundPage() {
  const breadcrumbItems = buildBreadcrumbsForPathname("/refund-policy", {
    "/refund-policy": "Refund Policy",
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
      <RefundPolicyPage />
    </>
  );
}
