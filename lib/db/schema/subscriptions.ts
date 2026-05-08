import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { businesses } from "@/lib/db/schema/businesses";
import { user } from "@/lib/db/schema/auth";

/* ── Enums ────────────────────────────────────────────────────────────────── */

export const billingProviders = ["paymongo", "paddle"] as const;
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

export const billingCurrencies = ["PHP", "USD"] as const;
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
    uniqueIndex("account_subscriptions_user_id_unique").on(
      table.userId,
    ),
    index("account_subscriptions_status_idx").on(table.status),
    index("account_subscriptions_provider_subscription_id_idx").on(
      table.providerSubscriptionId,
    ),
  ],
);

/* ── business_subscriptions (DEPRECATED) ─────────────────────────────────── */

/**
 * @deprecated Use `accountSubscriptions` instead. Kept for rollback safety.
 * One row per business. The billing source of truth for subscription state.
 * Businesses without a row are implicitly on the free plan.
 */
export const businessSubscriptions = pgTable(
  "business_subscriptions",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: subscriptionStatusEnum("status").notNull().default("free"),
    plan: text("plan").notNull(), // "pro" | "business"
    billingProvider: billingProviderEnum("billing_provider").notNull(),
    billingCurrency: billingCurrencyEnum("billing_currency").notNull(),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    providerCheckoutId: text("provider_checkout_id"),
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
    uniqueIndex("business_subscriptions_business_id_unique").on(
      table.businessId,
    ),
    index("business_subscriptions_status_idx").on(table.status),
    index("business_subscriptions_provider_subscription_id_idx").on(
      table.providerSubscriptionId,
    ),
  ],
);

/* ── billing_events ───────────────────────────────────────────────────────── */

/**
 * Idempotent webhook event log. Every incoming provider event is recorded
 * before processing. `processedAt` is set once the event produces a
 * side-effect. Duplicate events (same `providerEventId`) are skipped.
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
    businessId: text("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
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
    index("billing_events_business_id_idx").on(table.businessId),
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
    businessId: text("business_id")
      .references(() => businesses.id, { onDelete: "set null" }),
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
    index("payment_attempts_business_id_idx").on(table.businessId),
    index("payment_attempts_provider_payment_id_idx").on(
      table.providerPaymentId,
    ),
  ],
);
