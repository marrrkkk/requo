import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    host: getSiteOrigin(),
    rules: [
      {
        allow: [
          "/",
          "/inquire",
          "/pricing",
          "/privacy",
          "/terms",
          "/refund-policy",
        ],
        disallow: [
          "/account/",
          "/api/",
          "/businesses/",
          "/forgot-password",
          "/invite/",
          "/login",
          "/onboarding",
          "/quote/",
          "/reset-password",
          "/signup",
          "/verify-email",
        ],
        userAgent: "*",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
