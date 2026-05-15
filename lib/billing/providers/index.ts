/**
 * Billing provider factory.
 *
 * Returns a concrete `BillingProviderInterface` implementation for the
 * requested provider key. Instances are cached as singletons so consumers
 * (subscription service, webhook processor, refund service, checkout API)
 * share a single configured client per process.
 *
 * Construction never throws on missing credentials. If the underlying
 * provider is not configured, instantiation still succeeds and individual
 * methods return structured errors at call time.
 */

import { env } from "@/lib/env";
import type { BillingProvider } from "@/lib/db/schema/subscriptions";

import { DodoProvider } from "./dodo";
import type { BillingProviderInterface } from "./interface";

export type {
  BillingProviderInterface,
  CancelSubscriptionResult,
  CheckoutSessionParams,
  CheckoutSessionResult,
  NormalizedEventType,
  NormalizedWebhookEvent,
  RefundResult,
} from "./interface";

let dodoInstance: DodoProvider | null = null;

function getDodoProvider(): DodoProvider {
  if (!dodoInstance) {
    dodoInstance = new DodoProvider({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      environment: env.DODO_ENVIRONMENT,
      productIds: {
        proMonthly: env.DODO_PRO_PRODUCT_ID,
        proYearly: env.DODO_PRO_YEARLY_PRODUCT_ID,
        businessMonthly: env.DODO_BUSINESS_PRODUCT_ID,
        businessYearly: env.DODO_BUSINESS_YEARLY_PRODUCT_ID,
      },
    });
  }

  return dodoInstance;
}

export function getBillingProvider(
  provider: BillingProvider,
): BillingProviderInterface {
  switch (provider) {
    case "dodo":
      return getDodoProvider();
    default: {
      // Exhaustiveness guard: BillingProvider is a closed union, but we still
      // throw at runtime to surface configuration mistakes (e.g., a stale row
      // in the database) loudly instead of returning silently broken state.
      const exhaustive: never = provider;
      throw new Error(`Unknown billing provider: ${String(exhaustive)}`);
    }
  }
}
