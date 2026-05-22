/**
 * scripts/mark-migrations-applied.ts
 *
 * Marks all Drizzle migrations as "already applied" in a production database
 * that was set up via `drizzle-kit push` rather than sequential migrations.
 *
 * This inserts rows into `drizzle.__drizzle_migrations` so the migrate script
 * doesn't try to re-run migrations for objects that already exist.
 *
 * Run once against prod:
 *   DATABASE_URL=<prod-url> npx tsx scripts/mark-migrations-applied.ts
 *
 * Safe to run multiple times — skips migrations already recorded.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });
config();

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type Journal = {
  entries: JournalEntry[];
};

async function main() {
  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set.");
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].some((h) =>
    databaseUrl.includes(h),
  );

  const client = postgres(databaseUrl, {
    ssl: isLocal ? false : "require",
    max: 1,
  });

  try {
    // Read the journal to know which migrations exist
    const journalPath = join(process.cwd(), "drizzle", "meta", "_journal.json");
    const journal: Journal = JSON.parse(readFileSync(journalPath, "utf-8"));

    // Ensure the drizzle schema and migrations table exist
    await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await client`
      CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    // Get already-applied hashes
    const existing = await client`
      SELECT hash FROM drizzle."__drizzle_migrations"
    `;
    const appliedHashes = new Set(existing.map((r) => r.hash));

    let inserted = 0;

    for (const entry of journal.entries) {
      // Drizzle uses the tag as the hash in the migrations table
      if (appliedHashes.has(entry.tag)) {
        console.log(`  ✓ Already recorded: ${entry.tag}`);
        continue;
      }

      await client`
        INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
        VALUES (${entry.tag}, ${entry.when})
      `;
      console.log(`  ✚ Marked as applied: ${entry.tag}`);
      inserted++;
    }

    console.log(
      `\n✅ Done. ${inserted} migration(s) marked as applied, ${journal.entries.length - inserted} already recorded.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to mark migrations.", error);
  process.exitCode = 1;
});
