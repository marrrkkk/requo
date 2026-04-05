import "server-only";

import { and, count, desc, eq, gt } from "drizzle-orm";

import {
  toBusinessNotificationItem,
} from "@/features/notifications/utils";
import type {
  BusinessNotificationBellView,
  BusinessNotificationRecord,
} from "@/features/notifications/types";
import { db } from "@/lib/db/client";
import {
  businessNotificationStates,
  businessNotifications,
} from "@/lib/db/schema";

const defaultNotificationLimit = 15;

export async function getBusinessNotificationBellView({
  businessId,
  businessSlug,
  userId,
  limit = defaultNotificationLimit,
}: {
  businessId: string;
  businessSlug: string;
  userId: string;
  limit?: number;
}): Promise<BusinessNotificationBellView> {
  const [rows, stateRows] = await Promise.all([
    db
      .select({
        id: businessNotifications.id,
        businessId: businessNotifications.businessId,
        inquiryId: businessNotifications.inquiryId,
        quoteId: businessNotifications.quoteId,
        type: businessNotifications.type,
        title: businessNotifications.title,
        summary: businessNotifications.summary,
        createdAt: businessNotifications.createdAt,
      })
      .from(businessNotifications)
      .where(eq(businessNotifications.businessId, businessId))
      .orderBy(desc(businessNotifications.createdAt))
      .limit(limit),
    db
      .select({
        lastReadAt: businessNotificationStates.lastReadAt,
      })
      .from(businessNotificationStates)
      .where(
        and(
          eq(businessNotificationStates.businessId, businessId),
          eq(businessNotificationStates.userId, userId),
        ),
      )
      .limit(1),
  ]);
  const lastReadAt = stateRows[0]?.lastReadAt ?? null;
  const unreadCount = lastReadAt
    ? Number(
        (
          await db
            .select({
              count: count(),
            })
            .from(businessNotifications)
            .where(
              and(
                eq(businessNotifications.businessId, businessId),
                gt(businessNotifications.createdAt, lastReadAt),
              ),
            )
        )[0]?.count ?? 0,
      )
    : Number(
        (
          await db
            .select({
              count: count(),
            })
            .from(businessNotifications)
            .where(eq(businessNotifications.businessId, businessId))
        )[0]?.count ?? 0,
      );

  return {
    items: (rows satisfies BusinessNotificationRecord[]).map((notification) =>
      toBusinessNotificationItem(businessSlug, notification, lastReadAt),
    ),
    unreadCount,
    lastReadAt: lastReadAt?.toISOString() ?? null,
  };
}
