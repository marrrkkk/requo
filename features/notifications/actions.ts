"use server";

import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
} from "@/lib/db/business-access";
import {
  markBusinessNotificationReadForUser,
  markBusinessNotificationsReadForUser,
} from "@/features/notifications/mutations";
import { fetchBusinessNotificationsBeforeCursor } from "@/features/notifications/queries";
import type {
  BusinessNotificationActionResult,
  BusinessNotificationLoadMoreResult,
  BusinessNotificationSingleReadResult,
} from "@/features/notifications/types";
import { db } from "@/lib/db/client";
import { businessNotifications } from "@/lib/db/schema";

export async function markBusinessNotificationsReadAction(
  businessSlug: string,
  throughCreatedAt: string,
): Promise<BusinessNotificationActionResult> {
  const user = await requireUser();
  const businessContext = await getBusinessContextForMembershipSlug(
    user.id,
    businessSlug,
  );
  const parsedDate = new Date(throughCreatedAt);

  if (!businessContext) {
    return {
      ok: false,
      error: "That business could not be found.",
    };
  }

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      ok: false,
      error: "Choose a valid notification timestamp.",
    };
  }

  try {
    const lastReadAt = await markBusinessNotificationsReadForUser({
      businessId: businessContext.business.id,
      userId: user.id,
      throughCreatedAt: parsedDate,
    });

    return {
      ok: true,
      lastReadAt: lastReadAt.toISOString(),
    };
  } catch (error) {
    console.error("Failed to mark business notifications as read.", error);

    return {
      ok: false,
      error: "We couldn't update your notifications right now.",
    };
  }
}

/**
 * Mark a single notification as read WITHOUT advancing the watermark. Prevents
 * "click one notification → everything older gets marked read" bug.
 */
export async function markBusinessNotificationReadAction(
  businessSlug: string,
  notificationId: string,
): Promise<BusinessNotificationSingleReadResult> {
  const user = await requireUser();
  const businessContext = await getBusinessContextForMembershipSlug(
    user.id,
    businessSlug,
  );

  if (!businessContext) {
    return {
      ok: false,
      error: "That business could not be found.",
    };
  }

  // Verify the notification belongs to this business before writing.
  const [notification] = await db
    .select({
      id: businessNotifications.id,
      businessId: businessNotifications.businessId,
    })
    .from(businessNotifications)
    .where(
      and(
        eq(businessNotifications.id, notificationId),
        eq(
          businessNotifications.businessId,
          businessContext.business.id,
        ),
      ),
    )
    .limit(1);

  if (!notification) {
    return {
      ok: false,
      error: "That notification could not be found.",
    };
  }

  try {
    await markBusinessNotificationReadForUser({
      businessId: businessContext.business.id,
      notificationId: notification.id,
      userId: user.id,
    });

    return { ok: true, notificationId: notification.id };
  } catch (error) {
    console.error("Failed to mark notification as read.", error);

    return {
      ok: false,
      error: "We couldn't update your notification right now.",
    };
  }
}

export async function loadMoreBusinessNotificationsAction(
  businessSlug: string,
  cursorCreatedAt: string,
  cursorId: string,
  lastReadAt: string | null,
): Promise<BusinessNotificationLoadMoreResult> {
  const user = await requireUser();
  const businessContext = await getBusinessContextForMembershipSlug(
    user.id,
    businessSlug,
  );

  if (!businessContext) {
    return {
      ok: false,
      error: "That business could not be found.",
    };
  }

  try {
    const { items, hasMore } = await fetchBusinessNotificationsBeforeCursor({
      businessId: businessContext.business.id,
      businessSlug,
      userId: user.id,
      cursor: { createdAt: cursorCreatedAt, id: cursorId },
      lastReadAt,
    });

    return { ok: true, items, hasMore };
  } catch (error) {
    console.error("Failed to load older notifications.", error);

    return {
      ok: false,
      error: "We couldn't load more notifications right now.",
    };
  }
}
