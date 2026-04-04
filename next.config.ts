import type { NextConfig } from "next";

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
};

export default nextConfig;
