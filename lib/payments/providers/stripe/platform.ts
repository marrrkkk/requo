import "server-only";

import { env, isStripePlatformConfigured } from "@/lib/env";

export type StripePlatformConfig = {
  secretKey: string;
  webhookSecret: string;
};

/** Platform credentials for Stripe Connect. Null = platform mode inert (BYO continues). */
export function getStripePlatformConfig(): StripePlatformConfig | null {
  if (!isStripePlatformConfigured) return null;
  return {
    secretKey: env.STRIPE_PLATFORM_SECRET_KEY as string,
    webhookSecret: env.STRIPE_PLATFORM_WEBHOOK_SECRET as string,
  };
}
