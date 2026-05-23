import type { Metadata } from "next";

import { StructuredData } from "@/components/seo/structured-data";
import { DpaPage as DpaPageContent } from "@/features/legal/components/dpa-page";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "Requo Data Processing Agreement (DPA) covering Standard Contractual Clauses, technical and organizational measures, and subprocessor disclosures for business customer data.",
  pathname: "/legal/dpa",
  title: "Data Processing Agreement",
});

export default function DpaPage() {
  const breadcrumbItems = buildBreadcrumbsForPathname("/legal/dpa", {
    "/legal/dpa": "Data Processing Agreement",
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
      <DpaPageContent />
    </>
  );
}
