"use server";

import { requireUser } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
} from "@/lib/db/business-access";
import { markBusinessNotificationsReadForUser } from "@/features/notifications/mutations";
import { fetchBusinessNotificationsBeforeCursor } from "@/features/notifications/queries";
import type {
  BusinessNotificationActionResult,
  BusinessNotificationLoadMoreResult,
} from "@/features/notifications/types";

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
