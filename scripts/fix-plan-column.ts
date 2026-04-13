import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

async function addBusinessPlanColumn() {
  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) throw new Error("Missing DB URL");

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    await sql`
      DO $$ BEGIN
        CREATE TYPE "business_plan" AS ENUM ('free', 'pro', 'business');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Enum created or exists.");

    await sql`
      ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "plan" "business_plan" DEFAULT 'free' NOT NULL;
    `;
    console.log("Column added.");
  } catch (error) {
    console.error("Error adding column:", error);
  } finally {
    await sql.end();
  }
}

addBusinessPlanColumn();
