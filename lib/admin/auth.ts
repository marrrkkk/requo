/**
 * @deprecated This module has been removed as part of the migration from
 * JWT-cookie admin auth to database-backed Better Auth role authorization.
 * Admin access is now checked via `requireAdminUser()` in
 * `features/admin/access.ts`, which verifies `user.role === "admin"` in
 * the Better Auth session.
 *
 * This file is kept as an empty placeholder to prevent import resolution
 * errors during the migration window. Remove once all callers are updated.
 */
