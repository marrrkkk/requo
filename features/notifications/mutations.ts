import "server-only";

import { and, eq } from "drizzle-orm";

import type { BusinessNotificationType } from "@/features/notifications/types";
import { db } from "@/lib/db/client";
import {
  businessNotificationStates,
  businessNotifications,
} from "@/lib/db/schema";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type InsertBusinessNotificationInput = {
  businessId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  type: BusinessNotificationType;
  title: string;
  summary: string;
  metadata?: Record<string, unknown>;
  now?: Date;
};

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function insertBusinessNotification(
  tx: DbTransaction,
  {
    businessId,
    inquiryId = null,
    quoteId = null,
    type,
    title,
    summary,
    metadata = {},
    now = new Date(),
  }: InsertBusinessNotificationInput,
) {
  await tx.insert(businessNotifications).values({
    id: createId("ntf"),
    businessId,
    inquiryId,
    quoteId,
    type,
    title,
    summary,
    metadata,
    createdAt: now,
    updatedAt: now,
  });
}

export async function markBusinessNotificationsReadForUser({
  businessId,
  userId,
  throughCreatedAt,
}: {
  businessId: string;
  userId: string;
  throughCreatedAt: Date;
}) {
  const [existingState] = await db
    .select({
      id: businessNotificationStates.id,
      lastReadAt: businessNotificationStates.lastReadAt,
    })
    .from(businessNotificationStates)
    .where(
      and(
        eq(businessNotificationStates.businessId, businessId),
        eq(businessNotificationStates.userId, userId),
      ),
    )
    .limit(1);

  if (
    existingState?.lastReadAt &&
    existingState.lastReadAt.getTime() >= throughCreatedAt.getTime()
  ) {
    return existingState.lastReadAt;
  }

  if (existingState) {
    await db
      .update(businessNotificationStates)
      .set({
        lastReadAt: throughCreatedAt,
        updatedAt: new Date(),
      })
      .where(eq(businessNotificationStates.id, existingState.id));

    return throughCreatedAt;
  }

  const now = new Date();

  await db.insert(businessNotificationStates).values({
    id: createId("nts"),
    businessId,
    userId,
    lastReadAt: throughCreatedAt,
    createdAt: now,
    updatedAt: now,
  });

  return throughCreatedAt;
}
