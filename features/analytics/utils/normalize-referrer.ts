/**
 * Normalizes a document.referrer value for analytics storage.
 *
 * - Returns "direct" for empty, null, undefined, or same-origin referrers.
 * - Returns the domain (hostname) for all other referrers.
 */
export function normalizeReferrer(
  referrer: string | null | undefined,
  appOrigin: string | null | undefined,
): string {
  if (!referrer || referrer.trim() === "") {
    return "direct";
  }

  let referrerUrl: URL;
  try {
    referrerUrl = new URL(referrer);
  } catch {
    return "direct";
  }

  // Same-origin check: compare the origin of the referrer against the app origin
  if (appOrigin) {
    try {
      const appUrl = new URL(appOrigin);
      if (referrerUrl.origin === appUrl.origin) {
        return "direct";
      }
    } catch {
      // If appOrigin is invalid, skip same-origin check
    }
  }

  return referrerUrl.hostname;
}
