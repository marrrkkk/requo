import "server-only";

import webPush from "web-push";

import { getEmailSender, parseEmailAddress } from "@/lib/email/senders";
import { env, isPushConfigured } from "@/lib/env";

/**
 * Returns configured web-push VAPID details when push is available.
 * Call lazily so the module can be imported without throwing when keys
 * are not yet configured.
 */
export function getVapidDetails() {
  if (!isPushConfigured) {
    return null;
  }

  const senderEmail =
    parseEmailAddress(getEmailSender("system"))?.email ??
    `notifications@${env.EMAIL_DOMAIN}`;

  return {
    subject: `mailto:${senderEmail}`,
    publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: env.VAPID_PRIVATE_KEY!,
  };
}

/**
 * Initialise web-push with VAPID details. Must be called before
 * sending any push notification. Safe to call multiple times.
 */
export function ensureVapidConfigured() {
  const details = getVapidDetails();

  if (!details) {
    return false;
  }

  webPush.setVapidDetails(details.subject, details.publicKey, details.privateKey);

  return true;
}
