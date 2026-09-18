import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/lib/db/schema/auth";
import { businesses } from "@/lib/db/schema/businesses";

export const paymentProviders = ["paymongo", "stripe", "paypal"] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const paymentProviderEnum = pgEnum("payment_provider", [
  ...paymentProviders,
]);

export const providerEnvironments = ["test", "live"] as const;
export type ProviderEnvironment = (typeof providerEnvironments)[number];

export const providerEnvironmentEnum = pgEnum("provider_environment", [
  ...providerEnvironments,
]);

export const paymentSources = ["manual", "provider"] as const;
export type PaymentSource = (typeof paymentSources)[number];

export const paymentSourceEnum = pgEnum("payment_source", [...paymentSources]);

export const providerPaymentStatuses = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "partially_refunded",
  "refunded",
] as const;
export type ProviderPaymentStatus = (typeof providerPaymentStatuses)[number];

export const providerPaymentStatusEnum = pgEnum("provider_payment_status", [
  ...providerPaymentStatuses,
]);

export const paymentEventStatuses = [
  "processing",
  "processed",
  "failed",
  "ignored",
] as const;
export type PaymentEventStatus = (typeof paymentEventStatuses)[number];

export const paymentEventStatusEnum = pgEnum("payment_event_status", [
  ...paymentEventStatuses,
]);

export const connectionStatuses = ["onboarding", "action_required", "ready", "revoked"] as const;
export type ConnectionStatus = (typeof connectionStatuses)[number];

export const connectionStatusEnum = pgEnum("connection_status", [...connectionStatuses]);

export const connectionAuthModes = ["byo", "platform"] as const;
export type ConnectionAuthMode = (typeof connectionAuthModes)[number];

export const connectionAuthModeEnum = pgEnum("connection_auth_mode", [...connectionAuthModes]);

export const paymentProviderConnections = pgTable(
  "payment_provider_connections",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull(),
    environment: providerEnvironmentEnum("environment").notNull(),
    credentialsCiphertext: text("credentials_ciphertext").notNull(),
    publicHint: text("public_hint"),
    providerAccountId: text("provider_account_id"),
    status: connectionStatusEnum("status").notNull().default("ready"),
    authMode: connectionAuthModeEnum("auth_mode").notNull().default("byo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_provider_connections_business_id_idx").on(table.businessId),
    uniqueIndex("payment_provider_connections_business_provider_env_unique").on(
      table.businessId,
      table.provider,
      table.environment,
    ),
    uniqueIndex("payment_provider_connections_provider_env_account_unique")
      .on(table.provider, table.environment, table.providerAccountId)
      .where(sql`${table.providerAccountId} is not null`),
  ],
);

export const providerConnectionAttempts = pgTable(
  "provider_connection_attempts",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    provider: paymentProviderEnum("provider").notNull(),
    environment: providerEnvironmentEnum("environment").notNull(),
    providerAccountId: text("provider_account_id"),
    stateTokenHash: text("state_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("provider_connection_attempts_business_id_idx").on(table.businessId),
    index("provider_connection_attempts_expires_at_idx").on(table.expiresAt),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => paymentProviderConnections.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    status: paymentEventStatusEnum("status").notNull().default("processing"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("payment_events_business_id_idx").on(table.businessId),
    index("payment_events_connection_id_idx").on(table.connectionId),
    index("payment_events_status_idx").on(table.status),
    uniqueIndex("payment_events_connection_event_unique").on(
      table.connectionId,
      table.providerEventId,
    ),
  ],
);

export type PaymentProviderConnection = typeof paymentProviderConnections.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type ProviderConnectionAttempt = typeof providerConnectionAttempts.$inferSelect;
