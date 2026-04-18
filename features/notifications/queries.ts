import "server-only";

import { and, count, desc, eq, gt, sql } from "drizzle-orm";

import {
  toBusinessNotificationItem,
} from "@/features/notifications/utils";
import type {
  BusinessNotificationBellView,
  BusinessNotificationItem,
  BusinessNotificationRecord,
} from "@/features/notifications/types";
import { db } from "@/lib/db/client";
import {
  businessNotificationStates,
  businessNotifications,
} from "@/lib/db/schema";

const defaultNotificationLimit = 15;

export type BusinessNotificationCursor = {
  createdAt: string;
  id: string;
};

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
  const [rawRows, stateRows] = await Promise.all([
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
      .orderBy(
        desc(businessNotifications.createdAt),
        desc(businessNotifications.id),
      )
      .limit(limit + 1),
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
  const hasMore = rawRows.length > limit;
  const rows = hasMore ? rawRows.slice(0, limit) : rawRows;
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
    hasMore,
  };
}

/**
 * Older notifications than the given cursor (for infinite scroll in the bell popover).
 */
export async function fetchBusinessNotificationsBeforeCursor({
  businessId,
  businessSlug,
  userId,
  cursor,
  lastReadAt,
  limit = defaultNotificationLimit,
}: {
  businessId: string;
  businessSlug: string;
  userId: string;
  cursor: BusinessNotificationCursor;
  lastReadAt: string | null;
  limit?: number;
}): Promise<{
  items: BusinessNotificationItem[];
  hasMore: boolean;
}> {
  void userId;

  const cursorDate = new Date(cursor.createdAt);
  const olderThanCursor = sql`(${businessNotifications.createdAt}, ${businessNotifications.id}) < (${cursorDate}::timestamptz, ${cursor.id})`;

  const rawRows = await db
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
    .where(
      and(
        eq(businessNotifications.businessId, businessId),
        olderThanCursor,
      ),
    )
    .orderBy(
      desc(businessNotifications.createdAt),
      desc(businessNotifications.id),
    )
    .limit(limit + 1);

  const hasMore = rawRows.length > limit;
  const rows = hasMore ? rawRows.slice(0, limit) : rawRows;
  const lastRead = lastReadAt ? new Date(lastReadAt) : null;

  return {
    items: (rows satisfies BusinessNotificationRecord[]).map((notification) =>
      toBusinessNotificationItem(businessSlug, notification, lastRead),
    ),
    hasMore,
  };
}
