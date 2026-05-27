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

function getCliFlags() {
  const strict = process.argv.includes("--strict");
  return { strict };
}

function isLocalHost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function usesPoolerPort(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.port === "6543";
  } catch {
    return false;
  }
}

function getDatabaseUrl({ strict }: { strict: boolean }) {
  const migrationUrl = process.env.DATABASE_MIGRATION_URL;
  const runtimeUrl = process.env.DATABASE_URL;

  if (strict && !migrationUrl) {
    throw new Error(
      "DATABASE_MIGRATION_URL is required in strict mode.\n" +
        "Use a direct Postgres connection (Supabase port 5432, not 6543 pooler).",
    );
  }

  const databaseUrl = migrationUrl ?? runtimeUrl;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_MIGRATION_URL or DATABASE_URL must be set before running migrations.",
    );
  }

  if (usesPoolerPort(databaseUrl)) {
    throw new Error(
      "Migration URL points to port 6543 (pooler). Use a direct DB URL for DDL migrations (port 5432).",
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

    return !isLocalHost(hostname);
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
  const flags = getCliFlags();
  const databaseUrl = getDatabaseUrl(flags);

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
