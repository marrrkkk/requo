import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site";

const staticPages = [
  {
    changeFrequency: "weekly",
    path: "/",
    priority: 1,
  },
  {
    changeFrequency: "monthly",
    path: "/pricing",
    priority: 0.8,
  },
  {
    changeFrequency: "yearly",
    path: "/privacy",
    priority: 0.2,
  },
  {
    changeFrequency: "yearly",
    path: "/terms",
    priority: 0.2,
  },
  {
    changeFrequency: "yearly",
    path: "/refund-policy",
    priority: 0.2,
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return staticPages.map((page) => ({
    changeFrequency: page.changeFrequency,
    lastModified,
    priority: page.priority,
    url: absoluteUrl(page.path),
  }));
}
