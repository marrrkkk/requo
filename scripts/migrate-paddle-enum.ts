import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;

if (!url) {
  console.error("❌ DATABASE_MIGRATION_URL or DATABASE_URL must be set");
  process.exit(1);
}

const sql = postgres(url);

async function main() {
  try {
    await sql.unsafe(
      `ALTER TYPE billing_provider RENAME VALUE 'lemonsqueezy' TO 'paddle'`
    );
    console.log("✅ billing_provider enum updated: lemonsqueezy → paddle");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist")) {
      console.log("ℹ️  Value 'lemonsqueezy' not found — already renamed or doesn't exist. Skipping.");
    } else {
      console.error("❌ Migration failed:", msg);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main();
