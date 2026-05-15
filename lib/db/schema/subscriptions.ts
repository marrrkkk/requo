import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";

/* ── Enums ────────────────────────────────────────────────────────────────── */

export const billingProviders = ["dodo"] as const;
export type BillingProvider = (typeof billingProviders)[number];

export const billingProviderEnum = pgEnum("billing_provider", [
  ...billingProviders,
]);

export const subscriptionStatuses = [
  "free",
  "pending",
  "active",
  "past_due",
  "canceled",
  "expired",
  "incomplete",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  ...subscriptionStatuses,
]);

export const billingCurrencies = ["USD", "PHP"] as const;
export type BillingCurrency = (typeof billingCurrencies)[number];

export const billingCurrencyEnum = pgEnum("billing_currency", [
  ...billingCurrencies,
]);

export const paymentAttemptStatuses = [
  "pending",
  "succeeded",
  "failed",
  "expired",
] as const;
export type PaymentAttemptStatus = (typeof paymentAttemptStatuses)[number];

export const paymentAttemptStatusEnum = pgEnum("payment_attempt_status", [
  ...paymentAttemptStatuses,
]);

export const refundStatuses = ["pending", "approved", "failed"] as const;
export type RefundStatus = (typeof refundStatuses)[number];

export const refundStatusEnum = pgEnum("refund_status", [...refundStatuses]);

/* ── account_subscriptions ──────────────────────────────────────────────── */

/**
 * One row per user account. The billing source of truth for subscription state.
 * Users without a row are implicitly on the free plan.
 * All businesses owned by the user inherit the plan from this subscription.
 */
export const accountSubscriptions = pgTable(
  "account_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: subscriptionStatusEnum("status").notNull().default("free"),
    plan: text("plan").notNull(), // "pro" | "business"
    billingProvider: billingProviderEnum("billing_provider").notNull(),
    billingCurrency: billingCurrencyEnum("billing_currency").notNull(),
    adaptiveCurrency: boolean("adaptive_currency").notNull().default(false),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    providerCheckoutId: text("provider_checkout_id"),
    paymentMethod: text("payment_method"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_subscriptions_user_id_unique").on(table.userId),
    index("account_subscriptions_status_idx").on(table.status),
    index("account_subscriptions_provider_subscription_id_idx").on(
      table.providerSubscriptionId,
    ),
  ],
);

/* ── billing_events ───────────────────────────────────────────────────────── */

/**
 * Idempotent webhook event log. Every incoming provider event is recorded
 * before processing. `status` tracks the processing lifecycle. `processedAt`
 * is set once the event produces a side-effect. Duplicate events (same
 * `providerEventId`) are skipped.
 *
 * `status` values: "processing" | "processed" | "failed" | "ignored".
 */
export const billingEvents = pgTable(
  "billing_events",
  {
    id: text("id").primaryKey(),
    providerEventId: text("provider_event_id").notNull(),
    provider: billingProviderEnum("provider").notNull(),
    eventType: text("event_type").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("processing"),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_events_provider_event_id_unique").on(
      table.providerEventId,
    ),
    index("billing_events_user_id_idx").on(table.userId),
    index("billing_events_provider_idx").on(table.provider),
  ],
);

/* ── payment_attempts ─────────────────────────────────────────────────────── */

/**
 * Payment history for audit, customer support, and UI display.
 */
export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    plan: text("plan").notNull(),
    provider: billingProviderEnum("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    amount: integer("amount").notNull(), // in smallest currency unit (centavos / cents)
    currency: billingCurrencyEnum("currency").notNull(),
    status: paymentAttemptStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_attempts_user_id_idx").on(table.userId),
    index("payment_attempts_provider_payment_id_idx").on(
      table.providerPaymentId,
    ),
  ],
);

/* ── refunds ─────────────────────────────────────────────────────────────── */

/**
 * Refund records for completed payments.
 *
 * A refund is created when an owner requests a refund for a paid transaction.
 * Status transitions through `pending` → `approved` | `failed` based on the
 * provider's refund webhook events.
 *
 * Duplicate refund requests for the same payment are prevented by
 * application-level checks before inserting a new row.
 */
export const refunds = pgTable(
  "refunds",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: billingProviderEnum("provider").notNull(),
    providerRefundId: text("provider_refund_id"),
    providerPaymentId: text("provider_payment_id").notNull(),
    amount: integer("amount").notNull(), // in smallest currency unit (centavos / cents)
    currency: billingCurrencyEnum("currency").notNull(),
    status: refundStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("refunds_user_id_idx").on(table.userId),
    index("refunds_provider_payment_id_idx").on(table.providerPaymentId),
    index("refunds_status_idx").on(table.status),
  ],
);
