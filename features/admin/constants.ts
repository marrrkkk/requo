/**
 * Admin console constants.
 *
 * Shared identifiers for audit actions, audit target types, and list
 * page sizes. The value arrays are the source of truth; derived union
 * types are re-exported for use across `features/admin/**`.
 */

/**
 * Every mutation and view action the admin console is allowed to write
 * to `admin_audit_logs`. Keep this list exhaustive — `writeAdminAuditLog`
 * and `admin_audit_logs` filters rely on it.
 */
export const ADMIN_ACTIONS = [
  // Views
  "view.dashboard",
  "view.users",
  "view.user",
  "view.businesses",
  "view.business",
  "view.subscriptions",
  "view.subscription",
  "view.audit-logs",
  // User mutations
  "user.force_verify_email",
  "user.revoke_all_sessions",
  "user.suspend",
  "user.unsuspend",
  "user.delete",
  // Subscription mutations
  "subscription.manual_plan_override",
  "subscription.force_cancel",
  // Impersonation lifecycle
  "impersonation.start",
  "impersonation.stop",
  // Password re-confirmation failures
  "confirmation.failed",
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

/**
 * Target types recorded on admin audit log rows. `"dashboard"` is used
 * for list/index views that do not target a specific record.
 */
export const ADMIN_TARGET_TYPES = [
  "user",
  "business",
  "subscription",
  "audit-log",
  "dashboard",
] as const;

export type AdminTargetType = (typeof ADMIN_TARGET_TYPES)[number];

/**
 * Placeholder `targetId` used on view-style audit entries where there
 * is no single record being targeted (e.g. list pages).
 */
export const ADMIN_DASHBOARD_TARGET_ID = "-" as const;

/** Default page size for most admin lists. */
export const ADMIN_DEFAULT_PAGE_SIZE = 25;

/** Page size for the audit log feed (tends to be scanned rather than read). */
export const ADMIN_AUDIT_PAGE_SIZE = 50;

/** Upper bound used when coercing user-supplied page size values. */
export const ADMIN_MAX_PAGE_SIZE = 100;

/**
 * Password re-confirmation TTL. Tokens expire this many seconds after
 * issue per Requirement 9.5.
 */
export const ADMIN_PASSWORD_CONFIRM_TTL_SECONDS = 5 * 60;

/**
 * Impersonation session duration passed to the Better Auth admin plugin
 * (seconds). Kept here so UI copy and the plugin config stay in sync.
 */
export const ADMIN_IMPERSONATION_SESSION_DURATION_SECONDS = 60 * 60;
