import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

const dbConnectTimeoutSeconds = 5;

const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

const connection =
  globalForDb.connection ??
  postgres(env.DATABASE_URL, {
    connect_timeout: dbConnectTimeoutSeconds,
    prepare: false,
  });

export const db = globalForDb.db ?? drizzle(connection, { schema });
export const dbConnection = connection;

if (env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
  globalForDb.db = db;
}
