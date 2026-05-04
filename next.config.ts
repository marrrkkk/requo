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
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "7mb",
    },
    staleTimes: {
      dynamic: 86400,
      static: 86400,
    },
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
        source: "/workspaces/:path*",
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

export default nextConfig;
