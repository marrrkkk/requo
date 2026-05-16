/**
 * scripts/billing-reset.ts
 *
 * Destructive billing-only schema reset.
 *
 * Drops every billing table, drops and recreates the billing-related enums
 * with the current Polar values, and recreates the billing tables to
 * match the updated Drizzle schema in `lib/db/schema/subscriptions.ts`.
 *
 * What this script touches:
 *   Tables (dropped + recreated): account_subscriptions, billing_events,
 *     payment_attempts, refunds.
 *   Tables (dropped only, legacy): business_subscriptions.
 *   Enums (dropped + recreated): billing_provider, billing_currency,
 *     refund_status.
 *   Enums left alone: subscription_status, payment_attempt_status.
 *
 * Run:  npx tsx scripts/billing-reset.ts [--force]
 * Reqs: DATABASE_URL in .env, NODE_ENV !== "production".
 *
 * ⚠ Destructive. Refuses to run when NODE_ENV=production.
 */
import "dotenv/config";

import { sql } from "drizzle-orm";

import { db, dbConnection } from "../lib/db/client";
import { env } from "../lib/env";

const force = process.argv.includes("--force");

async function dropTables() {
  console.log("🗑  Dropping billing tables (CASCADE)...");

  // Order matters when CASCADE is not used; we use CASCADE so any FK
  // dependencies (e.g. drizzle migration metadata) are cleared.
  const dropStatements = [
    `DROP TABLE IF EXISTS refunds CASCADE`,
    `DROP TABLE IF EXISTS payment_attempts CASCADE`,
    `DROP TABLE IF EXISTS billing_events CASCADE`,
    // Legacy table from the previous Paddle-era schema. Drop unconditionally.
    `DROP TABLE IF EXISTS business_subscriptions CASCADE`,
    `DROP TABLE IF EXISTS account_subscriptions CASCADE`,
  ];

  for (const stmt of dropStatements) {
    await db.execute(sql.raw(stmt));
    console.log(`   ${stmt}`);
  }

  console.log("   Done.\n");
}

async function resetEnums() {
  console.log("🔁 Recreating billing enums...");

  // Only the three enums whose values are changing in this migration are
  // dropped and recreated. `subscription_status` and `payment_attempt_status`
  // are intentionally left as-is.
  const enumStatements = [
    `DROP TYPE IF EXISTS billing_provider CASCADE`,
    `CREATE TYPE billing_provider AS ENUM ('polar')`,
    `DROP TYPE IF EXISTS billing_currency CASCADE`,
    `CREATE TYPE billing_currency AS ENUM ('USD', 'PHP')`,
    `DROP TYPE IF EXISTS refund_status CASCADE`,
    `CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'failed')`,
  ];

  for (const stmt of enumStatements) {
    await db.execute(sql.raw(stmt));
    console.log(`   ${stmt}`);
  }

  console.log("   Done.\n");
}

async function recreateTables() {
  console.log("🏗  Recreating billing tables...");

  // account_subscriptions — one row per user account, billing source of truth.
  await db.execute(
    sql.raw(`
      CREATE TABLE account_subscriptions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        status subscription_status NOT NULL DEFAULT 'free',
        plan text NOT NULL,
        billing_provider billing_provider NOT NULL,
        billing_currency billing_currency NOT NULL,
        provider_customer_id text,
        provider_subscription_id text,
        provider_checkout_id text,
        payment_method text,
        current_period_start timestamptz,
        current_period_end timestamptz,
        canceled_at timestamptz,
        trial_ends_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `),
  );
  await db.execute(
    sql.raw(
      `CREATE UNIQUE INDEX account_subscriptions_user_id_unique ON account_subscriptions (user_id)`,
    ),
  );
  await db.execute(
    sql.raw(
      `CREATE INDEX account_subscriptions_status_idx ON account_subscriptions (status)`,
    ),
  );
  await db.execute(
    sql.raw(
      `CREATE INDEX account_subscriptions_provider_subscription_id_idx ON account_subscriptions (provider_subscription_id)`,
    ),
  );
  console.log("   account_subscriptions");

  // billing_events — idempotent webhook log.
  await db.execute(
    sql.raw(`
      CREATE TABLE billing_events (
        id text PRIMARY KEY,
        provider_event_id text NOT NULL,
        provider billing_provider NOT NULL,
        event_type text NOT NULL,
        user_id text REFERENCES "user"(id) ON DELETE SET NULL,
        payload jsonb NOT NULL,
        status text NOT NULL DEFAULT 'processing',
        error_message text,
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `),
  );
  await db.execute(
    sql.raw(
      `CREATE UNIQUE INDEX billing_events_provider_event_id_unique ON billing_events (provider_event_id)`,
    ),
  );
  await db.execute(
    sql.raw(`CREATE INDEX billing_events_user_id_idx ON billing_events (user_id)`),
  );
  await db.execute(
    sql.raw(`CREATE INDEX billing_events_provider_idx ON billing_events (provider)`),
  );
  console.log("   billing_events");

  // payment_attempts — payment history for audit + UI.
  await db.execute(
    sql.raw(`
      CREATE TABLE payment_attempts (
        id text PRIMARY KEY,
        user_id text REFERENCES "user"(id) ON DELETE SET NULL,
        plan text NOT NULL,
        provider billing_provider NOT NULL,
        provider_payment_id text NOT NULL,
        amount integer NOT NULL,
        currency billing_currency NOT NULL,
        status payment_attempt_status NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `),
  );
  await db.execute(
    sql.raw(`CREATE INDEX payment_attempts_user_id_idx ON payment_attempts (user_id)`),
  );
  await db.execute(
    sql.raw(
      `CREATE INDEX payment_attempts_provider_payment_id_idx ON payment_attempts (provider_payment_id)`,
    ),
  );
  console.log("   payment_attempts");

  // refunds — refund records for completed payments.
  await db.execute(
    sql.raw(`
      CREATE TABLE refunds (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        provider billing_provider NOT NULL,
        provider_refund_id text,
        provider_payment_id text NOT NULL,
        amount integer NOT NULL,
        currency billing_currency NOT NULL,
        status refund_status NOT NULL DEFAULT 'pending',
        reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `),
  );
  await db.execute(sql.raw(`CREATE INDEX refunds_user_id_idx ON refunds (user_id)`));
  await db.execute(
    sql.raw(
      `CREATE INDEX refunds_provider_payment_id_idx ON refunds (provider_payment_id)`,
    ),
  );
  await db.execute(sql.raw(`CREATE INDEX refunds_status_idx ON refunds (status)`));
  console.log("   refunds");

  console.log("   Done.\n");
}

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to reset billing schema in production!");
  }

  console.log("\n💣 Requo Billing Reset\n");
  console.log("=".repeat(50));
  console.log(
    "⚠  DESTRUCTIVE: drops billing tables and recreates them with",
  );
  console.log("   updated enums for the Polar billing migration. All");
  console.log("   subscription, payment, billing-event, and refund rows");
  console.log("   will be lost.\n");

  if (force) {
    console.log("   --force flag detected; skipping interactive confirmation.\n");
  } else {
    // v1: refuse production + log the warning. No interactive prompt yet.
    console.log("   Proceeding (no production environment detected).\n");
  }

  await dropTables();
  await resetEnums();
  await recreateTables();

  console.log("=".repeat(50));
  console.log("\n✅ Billing schema reset complete.\n");
}

main()
  .catch((error) => {
    console.error("❌ Billing reset failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end({ timeout: 5 });
  });
