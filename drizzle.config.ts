import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_MIGRATION_URL;

if (!url) {
  throw new Error(
    "DATABASE_MIGRATION_URL must be set before running Drizzle commands.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
});
