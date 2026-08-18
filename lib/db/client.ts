import { drizzle } from "drizzle-orm/postgres-js";
import type { SQL } from "drizzle-orm";
import postgres from "postgres";

import { env } from "@/lib/env";
import { getDatabaseConnectionOptions } from "@/lib/db/connection-options";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

const connection =
  globalForDb.connection ??
  postgres(env.DATABASE_URL, getDatabaseConnectionOptions(env.DATABASE_URL));

export const db = globalForDb.db ?? drizzle(connection, { schema });
export const dbConnection = connection;

/**
 * Runs raw SQL via `db.execute` and always returns the result rows as an
 * array, regardless of the underlying driver (postgres-js returns the rows
 * array directly; node-postgres returns a QueryResult with a `rows` property).
 */
export async function executeRows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = (await db.execute<T>(query)) as T[] | { rows: T[] };
  return Array.isArray(result) ? result : result.rows;
}

if (env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
  globalForDb.db = db;
}
