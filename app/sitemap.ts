import type { MetadataRoute } from "next";

import { listPublicInquirySitemapEntries } from "@/features/inquiries/queries";
import { absoluteUrl } from "@/lib/seo/site";

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

/** Regenerate sitemap periodically; inquiry URLs also refresh on each build of this route. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = staticPages.map((page) => ({
    changeFrequency: page.changeFrequency,
    lastModified,
    priority: page.priority,
    url: absoluteUrl(page.path),
  }));

  const inquiryRows = await listPublicInquirySitemapEntries();
  const inquiryEntries = inquiryRows.map((row) => ({
    changeFrequency: "weekly" as const,
    lastModified: row.lastModified,
    priority: 0.6,
    url: absoluteUrl(row.pathname),
  }));

  return [...staticEntries, ...inquiryEntries];
}
