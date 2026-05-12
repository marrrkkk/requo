import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const baselineSecurityHeaders = [
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
] satisfies Array<{ key: string; value: string }>;

const sensitiveNoStoreHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
] satisfies Array<{ key: string; value: string }>;

const apiNoIndexHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
] satisfies Array<{ key: string; value: string }>;

const agentDiscoveryHeaders = [
  {
    key: "Link",
    value:
      '</.well-known/api-catalog>; rel="api-catalog", </.well-known/agent-skills/index.json>; rel="agent-skills", </.well-known/mcp/server-card.json>; rel="mcp-server-card"',
  },
] satisfies Array<{ key: string; value: string }>;

const nextConfig: NextConfig = {
  // Ensure preview bots get full metadata in the initial HTML (see Next.js streaming metadata).
  htmlLimitedBots:
    /facebookexternalhit|Facebot|LinkedInBot|Twitterbot|Pinterest|Slackbot|Discordbot|vkShare|redditbot|Applebot/i,
  cacheComponents: true,
  // Populate entries here only when `ANALYZE=true npm run build` shows a measurable
  // bundle-size win for a specific package. Keep the block present and documented so
  // future wins (e.g., barrel-heavy icon libraries) have a clear home.
  // Example (only add after verifying the subpath pattern in node_modules):
  //   "lucide-react": {
  //     transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
  //   },
  modularizeImports: {},
  images: {
    // Only add hosts here when a new <Image src="https://..."> is introduced.
    // All current images are local or generated via next/image routes.
    remotePatterns: [],
  },
  experimental: {
    instantNavigationDevToolsToggle: true,
    serverActions: {
      bodySizeLimit: "7mb",
    },
    staleTimes: {
      dynamic: 86400,
      static: 86400,
    },
    inlineCss: true,
  },
  async headers() {
    return [
      {
        source: "/",
        headers: agentDiscoveryHeaders,
      },
      {
        source: "/:path*",
        headers: baselineSecurityHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiNoIndexHeaders,
      },
      {
        source: "/businesses/:path*",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/forgot-password",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/invite/:path*",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/login",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/quote/:path*",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/reset-password",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/signup",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/verify-email",
        headers: sensitiveNoStoreHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  nextConfig,
);
