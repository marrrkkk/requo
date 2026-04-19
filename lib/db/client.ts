import { drizzle } from "drizzle-orm/postgres-js";
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

if (env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
  globalForDb.db = db;
}
