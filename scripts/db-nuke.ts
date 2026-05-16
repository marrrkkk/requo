/**
 * scripts/db-nuke.ts
 *
 * One-shot full DB reset for development.
 *
 * Drops the entire `public` schema CASCADE (every table, view, sequence,
 * type/enum) plus Drizzle's `drizzle` migration-journal schema, then
 * recreates an empty `public` schema. Leaves authentication and storage
 * extension schemas (`auth`, `storage`, `extensions`, etc.) untouched
 * — Supabase manages those. The follow-up `npm run db:migrate` step
 * will then apply every migration from `0000_init` onward.
 *
 * Refuses to run when NODE_ENV=production.
 */
import "dotenv/config";

import postgres from "postgres";

import { env } from "../lib/env";

function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_MIGRATION_URL or DATABASE_URL must be set to nuke the DB.",
    );
  }
  return databaseUrl;
}

function shouldRequireSsl(databaseUrl: string) {
  try {
    const { hostname, searchParams } = new URL(databaseUrl);
    if (searchParams.get("sslmode") === "disable") return false;
    return !["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to nuke the DB in production.");
  }

  const databaseUrl = getDatabaseUrl();
  const client = postgres(databaseUrl, {
    ssl: shouldRequireSsl(databaseUrl) ? "require" : false,
    max: 1,
  });

  try {
    console.log("\n💣 Nuking public + drizzle schemas...\n");
    await client.unsafe(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      DROP SCHEMA IF EXISTS drizzle CASCADE;
    `);
    console.log("   ✓ public schema reset");
    console.log("   ✓ drizzle migration-journal schema dropped\n");
    console.log(
      "Run `npm run db:migrate` next to apply migrations 0000-0003.\n",
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("❌ DB nuke failed.");
  console.error(error);
  process.exitCode = 1;
});
