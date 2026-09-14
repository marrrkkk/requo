/**
 * Cache tags for the Admin Console surface.
 *
 * Admin queries (dashboard counts, users/businesses/subscriptions lists,
 * audit log feed) are global — they read across every account — so the tags
 * are not scoped by user or business. Keeping them namespaced under `admin:`
 * prevents collisions with the user- and business-scoped tags in
 * `lib/cache/shell-tags.ts` and `lib/cache/business-tags.ts`.
 */

const ADMIN_SCOPE = "admin";

/** Tag for the landing operations dashboard counts. */
export function adminDashboardTag(): string {
  return `${ADMIN_SCOPE}:dashboard`;
}

/** Tag for the admin users list and user-detail queries. */
export function adminUsersTag(): string {
  return `${ADMIN_SCOPE}:users`;
}

/** Tag for the admin businesses list and business-detail queries. */
export function adminBusinessesTag(): string {
  return `${ADMIN_SCOPE}:businesses`;
}

/** Tag for the admin subscriptions list and subscription-detail queries. */
export function adminSubscriptionsTag(): string {
  return `${ADMIN_SCOPE}:subscriptions`;
}

/** Tag for the admin audit log feed. */
export function adminAuditTag(): string {
  return `${ADMIN_SCOPE}:audit`;
}

/** Tag for admin system health and configuration checks. */
export function adminSystemTag(): string {
  return `${ADMIN_SCOPE}:system`;
}

/** Tag for the admin AI overview aggregates (24h/7d windows). */
export function adminAiTag(): string {
  return `${ADMIN_SCOPE}:ai`;
}

/** Tag for the admin email list and email-detail queries. */
export function adminEmailsTag(): string {
  return `${ADMIN_SCOPE}:emails`;
}

/** Tag for the admin usage report aggregates. */
export function adminUsageTag(): string {
  return `${ADMIN_SCOPE}:usage`;
}
