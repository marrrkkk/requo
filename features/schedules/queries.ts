import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  commercialScheduleItems,
  commercialSchedules,
} from "@/lib/db/schema";

export async function getEditableScheduleForQuote(input: {
  businessId: string;
  quoteId: string;
}) {
  const [schedule] = await db
    .select()
    .from(commercialSchedules)
    .where(
      and(
        eq(commercialSchedules.businessId, input.businessId),
        eq(commercialSchedules.quoteId, input.quoteId),
      ),
    )
    .orderBy(desc(commercialSchedules.version))
    .limit(1);

  if (!schedule || schedule.state === "accepted" || schedule.state === "superseded") {
    return null;
  }

  const items = await db
    .select()
    .from(commercialScheduleItems)
    .where(eq(commercialScheduleItems.scheduleId, schedule.id))
    .orderBy(asc(commercialScheduleItems.position));

  return { ...schedule, items };
}

/**
 * Prefill source: always the latest approved (accepted) schedule version.
 * v1-vs-v2 resolution is max(version) — never the editable draft.
 */
export async function getLatestApprovedScheduleForQuote(input: {
  businessId: string;
  quoteId: string;
}) {
  const schedules = await db
    .select()
    .from(commercialSchedules)
    .where(
      and(
        eq(commercialSchedules.businessId, input.businessId),
        eq(commercialSchedules.quoteId, input.quoteId),
        eq(commercialSchedules.state, "accepted"),
      ),
    )
    .orderBy(desc(commercialSchedules.version))
    .limit(1);

  const schedule = schedules[0];
  if (!schedule) return null;

  const items = await db
    .select()
    .from(commercialScheduleItems)
    .where(eq(commercialScheduleItems.scheduleId, schedule.id))
    .orderBy(asc(commercialScheduleItems.position));

  return { ...schedule, items };
}

export async function listSchedulesForQuote(input: {
  businessId: string;
  quoteId: string;
}) {
  return db
    .select()
    .from(commercialSchedules)
    .where(
      and(
        eq(commercialSchedules.businessId, input.businessId),
        eq(commercialSchedules.quoteId, input.quoteId),
      ),
    )
    .orderBy(asc(commercialSchedules.version));
}
