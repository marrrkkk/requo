"use server";

import { requireUser } from "@/lib/auth/session";
import {
  getBusinessContextForMembershipSlug,
} from "@/lib/db/business-access";
import { markBusinessNotificationsReadForUser } from "@/features/notifications/mutations";
import type { BusinessNotificationActionResult } from "@/features/notifications/types";

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
