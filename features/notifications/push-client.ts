/**
 * Client-side Web Push helpers.
 *
 * These utilities manage service worker registration, push subscription,
 * and communication with the server API routes.
 */

import { publicEnv } from "@/lib/public-env";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/** Check if the browser supports push notifications. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Get the current Notification permission state. */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

/** Register the service worker and return the registration. */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Service worker registration failed.", error);
    return null;
  }
}

/** Get the current push subscription, if any. */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();

  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

/**
 * Request notification permission and subscribe to push.
 *
 * Returns the PushSubscription on success, or null if denied.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  const vapidPublicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    console.warn("VAPID public key is not configured.");
    return null;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    return null;
  }

  const registration = await getServiceWorkerRegistration();

  if (!registration) {
    return null;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    return subscription;
  } catch (error) {
    console.error("Push subscription failed.", error);
    return null;
  }
}

/**
 * Save a push subscription to the server.
 */
export async function savePushSubscription(
  subscription: PushSubscription,
  businessId: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        subscription: subscription.toJSON(),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Remove a push subscription from the server.
 */
export async function removePushSubscription(
  endpoint: string,
  businessId: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/push/unsubscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, endpoint }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
