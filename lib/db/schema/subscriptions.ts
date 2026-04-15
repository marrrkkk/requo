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

import { workspaces } from "@/lib/db/schema/workspaces";

/* ── Enums ────────────────────────────────────────────────────────────────── */

export const billingProviders = ["paymongo", "lemonsqueezy"] as const;
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

/* ── workspace_subscriptions ──────────────────────────────────────────────── */

/**
 * One row per workspace. The billing source of truth for subscription state.
 * Workspaces without a row are implicitly on the free plan.
 */
export const workspaceSubscriptions = pgTable(
  "workspace_subscriptions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
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
    uniqueIndex("workspace_subscriptions_workspace_id_unique").on(
      table.workspaceId,
    ),
    index("workspace_subscriptions_status_idx").on(table.status),
    index("workspace_subscriptions_provider_subscription_id_idx").on(
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
    workspaceId: text("workspace_id").references(() => workspaces.id, {
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
    index("billing_events_workspace_id_idx").on(table.workspaceId),
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
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
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
    index("payment_attempts_workspace_id_idx").on(table.workspaceId),
    index("payment_attempts_provider_payment_id_idx").on(
      table.providerPaymentId,
    ),
  ],
);
