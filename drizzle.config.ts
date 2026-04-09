import "dotenv/config";

const url = process.env.DATABASE_MIGRATION_URL;

if (!url) {
  throw new Error(
    "DATABASE_MIGRATION_URL must be set before running Drizzle commands.",
  );
}

const config = {
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
};

export default config;
