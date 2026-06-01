import "server-only";

import { lte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiTokenLogs } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Token Log Cleanup — deletes ai_token_logs entries older than 90 days
//
// Runs daily via Inngest cron. Deletes in batches of 1000 rows per execution
// to avoid long-running transactions.
// ---------------------------------------------------------------------------

const RETENTION_DAYS = 90;
const BATCH_SIZE = 1000;

export type TokenLogCleanupResult = {
  deletedRows: number;
};

/**
 * Deletes ai_token_logs entries older than 90 days.
 * Limits deletion to 1000 rows per execution to avoid long-running transactions.
 * Logs the number of deleted rows.
 */
export async function cleanupTokenLogs(): Promise<TokenLogCleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  // Find IDs of expired logs (batch limited to 1000)
  const expiredIds = await db
    .select({ id: aiTokenLogs.id })
    .from(aiTokenLogs)
    .where(lte(aiTokenLogs.createdAt, cutoffDate))
    .limit(BATCH_SIZE);

  if (expiredIds.length === 0) {
    console.info(
      JSON.stringify({
        type: "token_log_cleanup",
        timestamp: new Date().toISOString(),
        deletedRows: 0,
        cutoffDate: cutoffDate.toISOString(),
      }),
    );
    return { deletedRows: 0 };
  }

  // Delete by IDs
  const idsToDelete = expiredIds.map((row) => row.id);
  await db.execute(
    sql`DELETE FROM ai_token_logs WHERE id = ANY(${idsToDelete})`,
  );

  const deletedRows = idsToDelete.length;

  console.info(
    JSON.stringify({
      type: "token_log_cleanup",
      timestamp: new Date().toISOString(),
      deletedRows,
      cutoffDate: cutoffDate.toISOString(),
    }),
  );

  return { deletedRows };
}
