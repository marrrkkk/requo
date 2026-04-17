/**
 * Central billing type definitions.
 *
 * Re-exports the DB-level enums for convenience and adds domain types
 * for region detection, checkout creation, and webhook processing.
 */

import type { WorkspacePlan } from "@/lib/plans/plans";

export type {
  BillingProvider,
  BillingCurrency,
  SubscriptionStatus,
  PaymentAttemptStatus,
} from "@/lib/db/schema/subscriptions";

export type BillingRegion = "PH" | "INTL";

export type BillingInterval = "monthly" | "yearly";

export type PaidPlan = Exclude<WorkspacePlan, "free">;

export type PlanPricing = {
  PHP: number; // centavos
  USD: number; // cents
};

export type CheckoutResult =
  | {
      type: "redirect";
      url: string;
    }
  | {
      type: "qrph";
      qrCodeData: string;
      paymentIntentId: string;
      expiresAt: string;
      amount: number;
      currency: "PHP";
    }
  | {
      type: "error";
      message: string;
    };

export type WebhookProcessResult = {
  success: boolean;
  message: string;
  workspaceId?: string;
};
