/**
 * scripts/db-reset.ts
 *
 * Drops all tables and re-runs migrations from scratch.
 * FOR LOCAL DEVELOPMENT ONLY — refuses to run against production databases.
 *
 * Usage: npm run db:reset
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });
config();

function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_MIGRATION_URL or DATABASE_URL must be set before running migrations.",
    );
  }

  return databaseUrl;
}

function isLocalDatabase(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();

  if (!isLocalDatabase(databaseUrl) && process.env.ALLOW_REMOTE_RESET !== "1") {
    throw new Error(
      "db:reset refuses to run against non-local databases.\n" +
        "If you really need this (e.g. a disposable dev database on Supabase),\n" +
        "set ALLOW_REMOTE_RESET=1 in your environment.",
    );
  }

  console.log("⚠️  Dropping all tables and Drizzle metadata...");

  const client = postgres(databaseUrl, { max: 1 });

  try {
    // Drop all tables in public schema
    await client`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `;

    // Drop all custom types in public schema
    await client`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `;

    // Drop drizzle metadata schema
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;

    console.log("✅ Database cleared.");
    console.log("Running migrations...");

    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });

    console.log("✅ Migrations applied. Database is fresh.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("❌ Reset failed.", error);
  process.exitCode = 1;
});
