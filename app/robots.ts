import type { MetadataRoute } from "next";

import {
  PRIVATE_ROUTE_PREFIXES,
  PUBLIC_ROUTE_PREFIXES,
} from "@/lib/seo/route-registry";
import { absoluteUrl, getSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    host: getSiteOrigin(),
    rules: [
      {
        allow: [...PUBLIC_ROUTE_PREFIXES],
        disallow: [...PRIVATE_ROUTE_PREFIXES],
        userAgent: "*",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
