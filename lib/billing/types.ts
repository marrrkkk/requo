/**
 * Central billing type definitions.
 *
 * Re-exports the DB-level enums for convenience and adds domain types
 * for region detection, checkout creation, and webhook processing.
 */

import type { BusinessPlan } from "@/lib/plans/plans";

export type {
  BillingProvider,
  BillingCurrency,
  SubscriptionStatus,
  PaymentAttemptStatus,
} from "@/lib/db/schema/subscriptions";

export type BillingRegion = "global";

export type BillingInterval = "monthly" | "yearly";

export type PaidPlan = Exclude<BusinessPlan, "free">;

export type PlanPricing = {
  USD: number; // cents
};

export type CheckoutResult =
  | {
      type: "redirect";
      url: string;
    }
  | {
      type: "error";
      message: string;
    };

export type WebhookProcessResult = {
  success: boolean;
  message: string;
  businessId?: string;
};
