import "server-only";

import webPush from "web-push";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema/push-subscriptions";
import { ensureVapidConfigured } from "@/lib/push/vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

/**
 * Send a push notification to a single subscription.
 *
 * Returns `true` if the notification was delivered. On a 404/410 response
 * (expired subscription), the subscription row is automatically deleted
 * and `false` is returned.
 */
export async function sendPushNotification(
  subscription: {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload,
): Promise<boolean> {
  if (!ensureVapidConfigured()) {
    return false;
  }

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );

    return true;
  } catch (error) {
    if (error instanceof webPush.WebPushError) {
      // 404 or 410 means the subscription is no longer valid
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, subscription.id));

        return false;
      }
    }

    console.error("Failed to send push notification.", error);

    return false;
  }
}

/**
 * Send a push notification to all subscriptions for a given business.
 */
export async function sendPushToBusinessSubscribers(
  businessId: string,
  payload: PushPayload,
): Promise<number> {
  const subscriptions = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.businessId, businessId));

  if (subscriptions.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload)),
  );

  return results.filter(
    (r) => r.status === "fulfilled" && r.value === true,
  ).length;
}
