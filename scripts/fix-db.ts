import { db } from "../lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_on_member_invite_response" boolean DEFAULT true NOT NULL`);
    await db.execute(sql`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "notify_in_app_on_member_invite_response" boolean DEFAULT true NOT NULL`);
    console.log("Columns added");
  } catch (e) {
    console.error("Columns error:", e);
  }

  try {
    await db.execute(sql`ALTER TYPE "public"."inquiry_status" ADD VALUE IF NOT EXISTS 'overdue'`);
    console.log("inquiry_status updated");
  } catch (e) {
    console.error("overdue error:", e);
  }

  try {
    await db.execute(sql`ALTER TYPE "public"."business_notification_type" ADD VALUE IF NOT EXISTS 'business_member_invite_accepted'`);
    console.log("notification type 1 updated");
  } catch (e) {
    console.error("type 1 error:", e);
  }

  try {
    await db.execute(sql`ALTER TYPE "public"."business_notification_type" ADD VALUE IF NOT EXISTS 'business_member_invite_declined'`);
    console.log("notification type 2 updated");
  } catch (e) {
    console.error("type 2 error:", e);
  }
  
  process.exit(0);
}

main();