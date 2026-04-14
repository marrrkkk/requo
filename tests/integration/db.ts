import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/quoteflow";
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const testDb = drizzle(pool, { schema });

export async function closeTestDb() {
  await pool.end();
}
