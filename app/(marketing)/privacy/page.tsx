import type { Metadata } from "next";

import { StructuredData } from "@/components/seo/structured-data";
import { PrivacyPolicyPage } from "@/features/legal/components/privacy-policy-page";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "The Requo Privacy Policy covers accounts, public inquiry pages, quote links, uploads, and AI-assisted drafts for owner-led service businesses using Requo.",
  pathname: "/privacy",
  title: "Privacy Policy",
});

export default function PrivacyPage() {
  const breadcrumbItems = buildBreadcrumbsForPathname("/privacy", {
    "/privacy": "Privacy Policy",
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
      <PrivacyPolicyPage />
    </>
  );
}
