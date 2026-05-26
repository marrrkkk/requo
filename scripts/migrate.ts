/**
 * scripts/migrate.ts
 *
 * Applies all pending Drizzle migrations from the `drizzle/` folder.
 *
 * Used in:
 * - Local development: `npm run db:migrate`
 * - Production (Vercel): runs as part of `vercel-build` before `next build`
 *
 * Connection priority: DATABASE_MIGRATION_URL > DATABASE_URL
 * The migration URL should be a DIRECT connection (not pooler) for DDL safety.
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

function shouldRequireSsl(databaseUrl: string) {
  try {
    const { hostname, searchParams } = new URL(databaseUrl);
    const sslMode = searchParams.get("sslmode");

    if (sslMode === "disable") {
      return false;
    }

    return !["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return true;
  }
}

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.password = "****";
    return parsed.toString();
  } catch {
    return "[invalid url]";
  }
}

async function main() {
  const databaseUrl = getDatabaseUrl();

  console.log(`Connecting to: ${maskUrl(databaseUrl)}`);

  const client = postgres(databaseUrl, {
    ssl: shouldRequireSsl(databaseUrl) ? "require" : false,
    max: 1,
  });

  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("✅ Migrations applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("❌ Migration failed.");
  console.error(error);
  process.exitCode = 1;
});
