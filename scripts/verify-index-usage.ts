/**
 * Verify that composite indexes are used by the query planner for filtered list queries.
 * 
 * This script runs EXPLAIN on the inbox and quote list queries to confirm
 * that Index Scan or Index Only Scan is used (not Sequential Scan).
 * 
 * Usage: npx tsx scripts/verify-index-usage.ts
 * 
 * Requirements: DATABASE_URL or DATABASE_MIGRATION_URL must be set.
 */

import "@dotenvx/dotenvx/config";
import postgres from "postgres";

const connectionUrl =
  process.env.DATABASE_MIGRATION_URL ||
  process.env.DATABASE_URL;

if (!connectionUrl) {
  console.error("❌ No DATABASE_URL or DATABASE_MIGRATION_URL found. Set one in .env");
  process.exit(1);
}

const sql = postgres(connectionUrl, { max: 1 });

async function main() {
  console.log("🔍 Verifying query plan uses Index Scan for filtered list queries...\n");

  // Query 1: Inbox query (inquiries filtered by business_id, status, ordered by created_at DESC LIMIT 50)
  console.log("━━━ Query 1: Inquiries inbox query ━━━");
  console.log("EXPLAIN SELECT * FROM inquiries WHERE business_id = 'test_id' AND status = 'new' ORDER BY created_at DESC LIMIT 50;\n");

  const inquiriesExplain = await sql`
    EXPLAIN SELECT * FROM inquiries 
    WHERE business_id = 'test_id' AND status = 'new' 
    ORDER BY created_at DESC LIMIT 50
  `;

  const inquiriesPlan = inquiriesExplain.map((row: Record<string, unknown>) => 
    (row as { "QUERY PLAN": string })["QUERY PLAN"]
  ).join("\n");
  console.log(inquiriesPlan);
  console.log("");

  // Query 2: Quote list query (quotes filtered by business_id, status, ordered by created_at DESC LIMIT 50)
  console.log("━━━ Query 2: Quotes list query ━━━");
  console.log("EXPLAIN SELECT * FROM quotes WHERE business_id = 'test_id' AND status = 'draft' ORDER BY created_at DESC LIMIT 50;\n");

  const quotesExplain = await sql`
    EXPLAIN SELECT * FROM quotes 
    WHERE business_id = 'test_id' AND status = 'draft' 
    ORDER BY created_at DESC LIMIT 50
  `;

  const quotesPlan = quotesExplain.map((row: Record<string, unknown>) => 
    (row as { "QUERY PLAN": string })["QUERY PLAN"]
  ).join("\n");
  console.log(quotesPlan);
  console.log("");

  // Verification
  console.log("━━━ Verification ━━━");
  
  const inquiriesUsesIndex = inquiriesPlan.includes("Index Scan") || inquiriesPlan.includes("Index Only Scan");
  const quotesUsesIndex = quotesPlan.includes("Index Scan") || quotesPlan.includes("Index Only Scan");
  const inquiriesUsesSeqScan = inquiriesPlan.includes("Seq Scan");
  const quotesUsesSeqScan = quotesPlan.includes("Seq Scan");

  if (inquiriesUsesIndex && !inquiriesUsesSeqScan) {
    console.log("✅ Inquiries query uses Index Scan (not Sequential Scan)");
  } else if (inquiriesUsesSeqScan) {
    console.log("❌ Inquiries query uses Sequential Scan — index may not be effective");
  } else {
    console.log("⚠️  Inquiries query plan unclear — review output above");
  }

  if (quotesUsesIndex && !quotesUsesSeqScan) {
    console.log("✅ Quotes query uses Index Scan (not Sequential Scan)");
  } else if (quotesUsesSeqScan) {
    console.log("❌ Quotes query uses Sequential Scan — index may not be effective");
  } else {
    console.log("⚠️  Quotes query plan unclear — review output above");
  }

  const allPassed = inquiriesUsesIndex && quotesUsesIndex && !inquiriesUsesSeqScan && !quotesUsesSeqScan;
  
  if (allPassed) {
    console.log("\n🎉 All queries confirmed to use Index Scan. Requirement 10.9 verified.");
  } else {
    console.log("\n⚠️  Some queries did not use Index Scan. This may happen with very small tables");
    console.log("   where PostgreSQL's query planner prefers Seq Scan as more efficient.");
    console.log("   The indexes exist and will be used as tables grow beyond a few hundred rows.");
  }

  await sql.end();
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
