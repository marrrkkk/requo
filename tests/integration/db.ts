import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";

const connectionString =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/requo";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = connectionString;
}

const pool = new Pool({
  connectionString,
});

export const testDb = drizzle(pool, { schema });

export async function closeTestDb() {
  await pool.end();
}
