# Implementation Plan: Admin Console

## Overview

Incremental buildout of `/admin` behind an env-driven allow-list. Foundation first (types, access gate, audit, confirmation tokens, Better Auth admin plugin + schema migration), then read queries with the two-layer caching pattern, then destructive mutations routed through the existing `lib/billing/subscription-service.ts` single write path, then impersonation, then the UI shell and pages. Property tests land next to the code they validate so invariants fail loudly early.

## Tasks

- [x] 1. Set up admin feature foundation
  - [x] 1.1 Scaffold `features/admin/` module files
    - Create `features/admin/{types.ts, constants.ts, navigation.ts, schemas.ts}`
    - Define `AdminUserRow`, `AdminUserDetail`, `AdminBusinessRow`, `AdminSubscriptionRow`, `AdminAuditLogRow`
    - Define `ADMIN_ACTIONS`, `ADMIN_TARGET_TYPES`, default page sizes
    - Define Zod schemas for mutation inputs (force-verify, revoke, suspend, unsuspend, delete, plan override, force-cancel, start-impersonation) and list/filter inputs
    - Add `fast-check` to `devDependencies` for property tests
    - _Requirements: 2.1, 3.1, 4.x, 5.1, 6.1, 7.1, 8.1, 10.1_
  - [x] 1.2 Implement env parsing, allow-list check, and admin access gate
    - Extend `lib/env.ts` with `ADMIN_EMAILS` (optional, comma-separated)
    - Implement `isAdminEmail(email, list)` with case-insensitive, whitespace-trimmed comparison
    - Implement `requireAdminUser()` in `features/admin/access.ts` that composes session + verified-email + allow-list checks and calls `notFound()` on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 1.3 Write unit tests for `isAdminEmail` edge cases and Zod schemas
    - Cover empty list, comma-only list, unicode, trailing comma, and whitespace
    - Cover schema rejection of known-invalid mutation payloads
    - _Requirements: 1.4, 1.5_
  - [ ]* 1.4 Write property test for admin access gate
    - **Property 1: Admin access gate rejects every non-qualifying request**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6**
  - [ ]* 1.5 Write property test for allow-list normalization
    - **Property 2: Email allow-list comparison is case-insensitive and whitespace-trimmed**
    - **Validates: Requirements 1.4**

- [x] 2. Integrate Better Auth admin plugin and extend auth schema
  - [x] 2.1 Wire `better-auth/plugins/admin` into `lib/auth/config.ts`
    - Configure with `adminRoles: []`, `impersonationSessionDuration: 60 * 60`, disallow admin-on-admin impersonation
    - Do not expose the plugin's client endpoints — admin calls go through our server actions
    - _Requirements: 4.3, 4.4, 8.1, 8.3_
  - [x] 2.2 Extend `lib/db/schema/auth.ts` and generate migration
    - Add `banned`, `banReason`, `banExpires` columns to `user`
    - Add `impersonatedBy` column to `session`
    - Generate and commit the drizzle migration
    - _Requirements: 4.3, 4.4, 8.1_
  - [ ]* 2.3 Integration smoke test for plugin server helpers
    - Assert `auth.api.banUser`, `auth.api.unbanUser`, `auth.api.revokeUserSessions`, `auth.api.impersonateUser`, `auth.api.stopImpersonating` are callable
    - _Requirements: 4.2, 4.3, 4.4, 8.1, 8.3_

- [x] 3. Implement password re-confirmation gate
  - [x] 3.1 Implement `features/admin/confirm.ts`
    - `issuePasswordConfirmTokenAction(password)` verifies the admin's password via Better Auth credentials and writes a single-use token row on the existing `verification` table with identifier `admin:confirm:{adminUserId}:{nonce}` and 5-minute TTL
    - `consumePasswordConfirmToken(token, { adminUserId, intendedAction, intendedTargetId })` matches + deletes atomically
    - Register a `/admin/confirm` rule in Better Auth's database rate limiter (5 attempts per 5 minutes per admin id)
    - _Requirements: 9.1, 9.2, 9.4, 9.5_
  - [ ]* 3.2 Write property test for confirmation tokens
    - **Property 17: Password confirmation tokens are single-use and short-lived**
    - **Validates: Requirements 9.4, 9.5**
  - [ ]* 3.3 Integration test for issuance happy + unhappy paths
    - Cover wrong password, rate-limit exceeded, successful issuance and single-use consume
    - _Requirements: 9.2, 9.3_

- [x] 4. Implement audit logging utilities
  - [x] 4.1 Implement `features/admin/audit.ts`
    - `writeAdminAuditLog({ action, targetType, targetId, metadata, tx? })` that extracts ip + user-agent via Better Auth `ipAddressHeaders` precedence and writes to `admin_audit_logs`
    - `wrapAdminRouteWithViewLog(handler, { action, targetType, targetId })` for page/list view logs
    - `runAdminMutationWithAudit(mutationFn, { action, targetType, targetId, metadata })` that wraps the mutation + audit insert in a single `db.transaction()` so audit write failures roll back the mutation
    - For mutations while impersonating, always include `metadata.impersonatedUserId`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ]* 4.2 Write property test for audit completeness
    - **Property 19: Every admin operation produces a complete audit row**
    - **Validates: Requirements 10.1, 10.2**

- [x] 5. Checkpoint — Ensure foundation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement admin read queries and caching
  - [x] 6.1 Implement `features/admin/queries.ts`
    - `getAdminDashboardCounts` (total users, businesses, active subs grouped by plan, last-7d sign-ups, inquiries, quotes sent)
    - `listAdminUsers`, `getAdminUserDetail`
    - `listAdminBusinesses`, `getAdminBusinessDetail`
    - `listAdminSubscriptions`, `getAdminSubscriptionDetail`
    - `listAdminAuditLogs`
    - Use the two-layer caching pattern (inner `"use cache"` function + `React.cache()` wrapper) for dashboard counts and shell-level queries; parallelize independent reads with `Promise.all`
    - Dashboard counts use `cacheLife({ revalidate: 60 })` to cap staleness
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 10.5, 10.6_
  - [x] 6.2 Add admin cache tag helpers in `lib/cache/admin-tags.ts`
    - Follow the scoping conventions in `lib/cache/shell-tags.ts` and `lib/cache/business-tags.ts`
    - Export `adminDashboardTag()`, `adminUsersTag()`, `adminBusinessesTag()`, `adminSubscriptionsTag()`, `adminAuditTag()`
    - _Requirements: 2.3_
  - [ ]* 6.3 Write property test for dashboard active grouping
    - **Property 3: Subscription plan grouping sums to active total**
    - **Validates: Requirements 2.2**
  - [ ]* 6.4 Write property test for user search
    - **Property 4: User search returns all and only substring matches**
    - **Validates: Requirements 3.2**
  - [ ]* 6.5 Write property test for user list ordering
    - **Property 5: User list default ordering is createdAt descending**
    - **Validates: Requirements 3.4**
  - [ ]* 6.6 Write property test for business search
    - **Property 10: Business search returns all and only substring matches**
    - **Validates: Requirements 5.2**
  - [ ]* 6.7 Write property test for subscription status filter
    - **Property 11: Subscription status filter is parity-preserving**
    - **Validates: Requirements 6.3**
  - [ ]* 6.8 Write property test for audit log listing
    - **Property 21: Audit log listing is filter-preserving and ordered**
    - **Validates: Requirements 10.5, 10.6**
  - [ ]* 6.9 Smoke test dashboard cache revalidate ≤ 60
    - Assert the dashboard counts query registers `cacheLife({ revalidate: 60 })` (or stricter)
    - _Requirements: 2.3_

- [x] 7. Implement user management mutations
  - [x] 7.1 Implement user-management server actions in `features/admin/mutations.ts`
    - `forceVerifyEmailAction`, `revokeAllSessionsAction`, `suspendUserAction`, `unsuspendUserAction`, `deleteUserAction`
    - Each action: `requireAdminUser()` → Zod validate → reject self-target for destructive cases → `consumePasswordConfirmToken(...)` → perform mutation via Better Auth admin plugin helpers (`banUser`, `unbanUser`, `revokeUserSessions`) or direct Drizzle update wrapped in `runAdminMutationWithAudit`
    - Call existing `writeAccountAuditLogsForUser` for fan-out to business-scoped `audit_logs` on destructive events that touch owned businesses
    - Call `revalidateTag` on the relevant user + business billing tags
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.1, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_
  - [ ]* 7.2 Write property test for force-email-verify idempotence
    - **Property 6: Force email verify is idempotent and converges to verified**
    - **Validates: Requirements 4.1**
  - [ ]* 7.3 Write property test for revoke-all-sessions
    - **Property 7: Revoke all sessions zeroes the target's session set**
    - **Validates: Requirements 4.2**
  - [ ]* 7.4 Write property test for suspend/unsuspend round trip
    - **Property 8: Suspend then unsuspend is a round trip for authentication**
    - **Validates: Requirements 4.3, 4.4**
  - [ ]* 7.5 Write property test for self-action rejection
    - **Property 9: Destructive self-actions are rejected**
    - **Validates: Requirements 4.6, 8.5**
  - [ ]* 7.6 Write property test for confirmation-failure path
    - **Property 18: Destructive actions require a valid confirmation token**
    - **Validates: Requirements 9.3**
  - [ ]* 7.7 Write property test for audit-rollback behavior
    - **Property 20: Audit write failure aborts the mutation**
    - **Validates: Requirements 10.4**
  - [ ]* 7.8 Integration test for delete-user cascade + Better Auth preflight
    - Assert `lib/auth/config.ts` `deleteUser.beforeDelete` fires and downstream rows cascade per schema
    - _Requirements: 4.5_

- [x] 8. Implement subscription override mutations
  - [x] 8.1 Add subscription-override actions to `features/admin/mutations.ts`
    - `manualPlanOverrideAction` → calls `activateSubscription({ userId, plan, provider, currency, status: 'active' })` on `lib/billing/subscription-service.ts`
    - `forceCancelSubscriptionAction` → calls `cancelSubscription(userId)` on the service so `syncOwnerBusinessPlans` runs
    - Wrap each in `runAdminMutationWithAudit` so audit and subscription writes share a transaction; surface service errors via `getUserSafeErrorMessage`
    - No direct writes to `account_subscriptions`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4_
  - [ ]* 8.2 Write property test for plan override synchronization
    - **Property 12: Manual plan override keeps subscription and owned businesses in sync**
    - **Validates: Requirements 7.1, 7.3**
  - [ ]* 8.3 Write property test for force-cancel behavior
    - **Property 13: Force-cancel produces canceled status with canceledAt and preserves grace-period access**
    - **Validates: Requirements 7.2, 7.3**
  - [ ]* 8.4 Write property test for subscription-service error rollback
    - **Property 14: Subscription-service errors leave state unchanged**
    - **Validates: Requirements 7.4**
  - [ ]* 8.5 Static check — no direct `account_subscriptions` writes from `features/admin/**`
    - Grep-style test asserting admin mutations go through `subscription-service`
    - _Requirements: 7.3_

- [ ] 9. Implement impersonation mutations and routes
  - [x] 9.1 Add impersonation actions to `features/admin/mutations.ts`
    - `startImpersonationAction(targetUserId, confirmToken)`: reject self-target; if an impersonation session is already active, call `auth.api.stopImpersonating()` first then `auth.api.impersonateUser({ userId })`
    - `stopImpersonationAction()`: no-op when not impersonating; otherwise call `auth.api.stopImpersonating()` and restore the admin session without prompting for a password
    - Audit both start and stop; include `impersonatedUserId` metadata for mutations performed while impersonating
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 10.3_
  - [-] 9.2 Add route handlers `app/admin/users/[userId]/impersonate/route.ts` and `app/admin/stop-impersonating/route.ts`
    - `POST` start: require admin + consume confirm token, call `startImpersonationAction`, redirect to `/businesses`
    - `POST` stop: call `stopImpersonationAction`, redirect to `/admin`
    - _Requirements: 8.1, 8.3_
  - [ ]* 9.3 Write property test for impersonation round trip
    - **Property 15: Impersonation round trip restores the admin session and tags audit metadata**
    - **Validates: Requirements 8.1, 8.3, 8.4, 10.3**
  - [ ]* 9.4 Write property test for impersonation switching
    - **Property 16: Starting a new impersonation cleans up the previous one**
    - **Validates: Requirements 8.6**

- [~] 10. Checkpoint — Ensure mutation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement admin shell, navigation, and global impersonation banner
  - [-] 11.1 Create admin layout and shell
    - `app/admin/layout.tsx` calls `requireAdminUser()`, renders `AdminShell` with `DashboardPage` + `PageHeader`
    - `app/admin/loading.tsx` provides a shared skeleton
    - Write a view audit entry on every render via `wrapAdminRouteWithViewLog`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 10.1_
  - [-] 11.2 Create `AdminNav` in `features/admin/components/admin-nav.tsx`
    - Items: Dashboard, Users, Businesses, Subscriptions, Audit — sourced from `features/admin/navigation.ts`
    - Reuse conventions from `components/shell/dashboard-navigation.tsx`
    - _Requirements: 2.1, 3.1, 5.1, 6.1, 10.5_
  - [ ] 11.3 Create `ImpersonationBanner` and mount it in authenticated layouts
    - `components/shell/impersonation-banner.tsx` reads `session.impersonatedBy`; render an `Alert` with Stop Impersonating control; handle the "impersonated user deleted" race
    - Mount in existing authenticated layouts (`app/(workspaces)`, `app/account/layout.tsx`, `app/businesses/layout.tsx`, admin shell)
    - _Requirements: 8.2, 8.3_
  - [x] 11.4 Create `ConfirmPasswordDialog`
    - `features/admin/components/confirm-password-dialog.tsx`
    - Submits `issuePasswordConfirmTokenAction`, returns token to parent on success, shows inline error on failure
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ]* 11.5 Component test for `ConfirmPasswordDialog`
    - Submit-on-enter, wrong password shows error, success returns token
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ]* 11.6 Component test for `ImpersonationBanner`
    - Renders when `session.impersonatedBy` is set; absent otherwise
    - _Requirements: 8.2_

- [ ] 12. Implement admin pages
  - [~] 12.1 Dashboard page `app/admin/page.tsx`
    - Renders six tiles via `AdminDashboard`; each tile is a Suspense boundary with a per-tile retry placeholder if its count query fails
    - _Requirements: 2.1, 2.3, 2.4_
  - [~] 12.2 Users list + detail
    - `app/admin/users/page.tsx` renders `AdminUsersTable` with search, pagination, and suspended badge
    - `app/admin/users/[userId]/page.tsx` renders `AdminUserDetail` + `AdminUserActions` (verify, revoke, suspend/unsuspend, delete, impersonate); gate each action through `ConfirmPasswordDialog`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.1, 9.1_
  - [~] 12.3 Businesses list + read-only detail
    - `app/admin/businesses/page.tsx` renders `AdminBusinessesTable`
    - `app/admin/businesses/[businessId]/page.tsx` renders `AdminBusinessDetail` with no mutation affordances
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [~] 12.4 Subscriptions list + detail + override form
    - `app/admin/subscriptions/page.tsx` renders `AdminSubscriptionsTable` with a status filter
    - `app/admin/subscriptions/[subscriptionId]/page.tsx` renders `AdminSubscriptionDetail` with recent `payment_attempts` and `billing_events`, plus `AdminSubscriptionOverrideForm` (plan override + force-cancel) gated by `ConfirmPasswordDialog`
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 9.1_
  - [~] 12.5 Audit logs page `app/admin/audit-logs/page.tsx`
    - Paginated `AdminAuditTable` with filters for admin user, action, target type, target id; ordered `createdAt` desc
    - _Requirements: 10.5, 10.6_
  - [ ]* 12.6 Component test for `AdminDashboard` tiles and retry placeholder
    - _Requirements: 2.1, 2.4_
  - [ ]* 12.7 Component test for `AdminUsersTable` columns + suspended badge
    - _Requirements: 3.1_
  - [ ]* 12.8 Component test for `AdminUserActions` self-disable and confirm-dialog flow
    - _Requirements: 4.6, 9.1_
  - [ ]* 12.9 Component test for `AdminBusinessDetail` rendering no mutation controls
    - _Requirements: 5.4_

- [ ] 13. Access-gate integration and end-to-end smoke coverage
  - [ ]* 13.1 Integration test — 404 behavior across admin routes + actions
    - Unauthenticated, non-admin, and unverified-admin requests return 404 on every admin page, route handler, and server action
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - [ ]* 13.2 Playwright smoke for admin flows
    - Non-admin signed-in user sees 404 at `/admin`
    - Admin lands on `/admin` with counts visible
    - Admin suspends a seeded user with password confirmation and the user can no longer sign in
    - Admin starts impersonation, banner appears in `/businesses`, Stop Impersonating returns to `/admin` without a password prompt
    - _Requirements: 1.2, 4.3, 4.7, 8.1, 8.2, 8.3, 9.1, 9.2, 9.4_

- [~] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional for a faster MVP but recommended; each maps to a design property or a specific requirement.
- All subscription writes route through `lib/billing/subscription-service.ts` — never direct DB writes.
- Shell-level queries follow the two-layer caching pattern and tag helpers in `lib/cache/shell-tags.ts`; a new `lib/cache/admin-tags.ts` mirrors the convention for admin-only scopes.
- Access gate returns 404, not 403, so `/admin` stays undiscoverable.
- Destructive mutations consume a single-use password confirmation token in the same transaction as the audit write.
- Property tests live in `tests/unit/admin/**.property.test.ts` and `tests/integration/admin/**.property.test.ts`, each tagged with a design-doc reference comment.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "3.1", "4.1", "6.2", "2.3"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "3.2", "3.3", "4.2", "6.1"] },
    { "id": 3, "tasks": ["6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "7.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "8.1", "11.4"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4", "8.5", "9.1", "11.1", "11.2", "11.3", "11.5"] },
    { "id": 6, "tasks": ["9.2", "9.3", "9.4", "11.6", "12.1", "12.2", "12.3", "12.4", "12.5"] },
    { "id": 7, "tasks": ["12.6", "12.7", "12.8", "12.9", "13.1", "13.2"] }
  ]
}
```
