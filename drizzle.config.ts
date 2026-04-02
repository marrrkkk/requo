import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL or DATABASE_DIRECT_URL must be set before running Drizzle commands.",
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
