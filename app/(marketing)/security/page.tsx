import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import { StructuredData } from "@/components/seo/structured-data";
import { SecurityPage } from "@/features/legal/components/security-page";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "Learn how Requo protects your data with TLS 1.3 encryption, AES-256 at rest, role-based access control, security headers, and GDPR-aligned practices.",
  pathname: "/security",
  title: "Security",
});

export default async function SecurityRoutePage() {
  "use cache";
  cacheLife("hours");
  const breadcrumbItems = buildBreadcrumbsForPathname("/security", {
    "/security": "Security",
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
      <SecurityPage />
    </>
  );
}
