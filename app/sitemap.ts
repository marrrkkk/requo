import type { MetadataRoute } from "next";

import { listPublicBusinessSitemapEntries } from "@/features/businesses/queries";
import { listPublicInquirySitemapEntries } from "@/features/inquiries/queries";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * Static Public_Route entries. `/inquire` is the public inquiry entry point
 * and is indexable; the rest mirror the marketing and legal surface.
 */
const staticPages = [
  {
    changeFrequency: "weekly" as const,
    path: "/",
    priority: 1,
  },
  {
    changeFrequency: "monthly" as const,
    path: "/pricing",
    priority: 0.8,
  },
  {
    changeFrequency: "weekly" as const,
    path: "/inquire",
    priority: 0.7,
  },
  {
    changeFrequency: "yearly" as const,
    path: "/privacy",
    priority: 0.2,
  },
  {
    changeFrequency: "yearly" as const,
    path: "/terms",
    priority: 0.2,
  },
  {
    changeFrequency: "yearly" as const,
    path: "/refund-policy",
    priority: 0.2,
  },
] as const;

/** Regenerate sitemap periodically; dynamic URLs also refresh on each build of this route. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const rootUrl = absoluteUrl("/");

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => {
    const url = absoluteUrl(page.path);
    const entry: MetadataRoute.Sitemap[number] = {
      changeFrequency: page.changeFrequency,
      lastModified,
      priority: page.priority,
      url,
    };

    if (url === rootUrl) {
      // Root entry advertises the site-wide social preview so crawlers
      // can associate `/` with the OG image (R4 AC 5).
      entry.images = [absoluteUrl("/opengraph-image")];
    }

    return entry;
  });

  const [inquiryRows, businessRows] = await Promise.all([
    listPublicInquirySitemapEntries(),
    listPublicBusinessSitemapEntries(),
  ]);

  const inquiryEntries: MetadataRoute.Sitemap = inquiryRows.map((row) => ({
    changeFrequency: "weekly",
    lastModified: row.lastModified,
    priority: 0.6,
    url: absoluteUrl(row.pathname),
  }));

  const businessEntries: MetadataRoute.Sitemap = businessRows
    .filter((row) => !row.noIndex)
    .map((row) => ({
      changeFrequency: "weekly",
      lastModified: row.lastModified,
      priority: 0.6,
      url: absoluteUrl(row.pathname),
    }));

  return [...staticEntries, ...inquiryEntries, ...businessEntries];
}
