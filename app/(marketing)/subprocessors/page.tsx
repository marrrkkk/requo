import type { Metadata } from "next";

import { StructuredData } from "@/components/seo/structured-data";
import { SubprocessorsPage } from "@/features/legal/components/subprocessors-page";
import { absoluteUrl, createPageMetadata } from "@/lib/seo/site";
import {
  buildBreadcrumbsForPathname,
  getBreadcrumbListStructuredData,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  description:
    "List of third-party subprocessors used by Requo, including their purpose, data location, and links to privacy policies.",
  pathname: "/subprocessors",
  title: "Subprocessors",
});

export default function SubprocessorsRoute() {
  const breadcrumbItems = buildBreadcrumbsForPathname("/subprocessors", {
    "/subprocessors": "Subprocessors",
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
      <SubprocessorsPage />
    </>
  );
}
