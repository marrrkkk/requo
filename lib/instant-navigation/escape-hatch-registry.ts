/**
 * Escape-hatch tracked registry for the instant-navigation rollout.
 *
 * Each entry records a single in-scope route that is temporarily exempt from
 * instant validation, along with the justification and a review date.
 *
 * This array is the source of truth consumed by the migration-coverage check
 * script (`scripts/instant-navigation/check-coverage.ts`).
 *
 * Requirements: 3.1, 3.2
 */

import type { EscapeHatchEntry } from "./escape-hatches";

/**
 * The tracked registry of active escape-hatch entries.
 *
 * To add an exemption:
 * 1. Append an entry below with a specific `route`, a non-empty `reason`,
 *    and a `targetReviewDate` (YYYY-MM-DD).
 * 2. Validate the entry passes `validateEscapeHatch` before committing.
 * 3. Update `.kiro/specs/instant-navigation-rollout/escape-hatches.md` to
 *    keep the human-readable record in sync.
 *
 * Phase 4 review (admin, onboarding, new-business, businesses hub):
 * Admin console pages use a custom JWT cookie-based auth pattern
 * (`verifyAdminSession` via `cookies()`) that always redirects
 * unauthenticated requests. Since `redirect()` propagates through Suspense
 * boundaries, instant validation cannot render the static shell during build.
 * The structural Suspense pattern is already applied; validation will be
 * enabled once Next.js supports cookie-sample-based validation or after
 * refactoring admin auth to use `headers()`-based session resolution.
 */
export const escapeHatchRegistry: EscapeHatchEntry[] = [
  {
    route: "app/admin/(console)/page.tsx",
    reason:
      "Admin cookie-based auth (verifyAdminSession) always redirects during instant validation; redirect() propagates through Suspense and prevents static shell render.",
    targetReviewDate: "2026-08-01",
    active: true,
  },
  {
    route: "app/admin/(console)/system/page.tsx",
    reason:
      "Admin cookie-based auth (verifyAdminSession) always redirects during instant validation; redirect() propagates through Suspense and prevents static shell render.",
    targetReviewDate: "2026-08-01",
    active: true,
  },
  {
    route: "app/admin/(console)/users/page.tsx",
    reason:
      "Admin cookie-based auth (verifyAdminSession) always redirects during instant validation; redirect() propagates through Suspense and prevents static shell render.",
    targetReviewDate: "2026-08-01",
    active: true,
  },
  {
    route: "app/admin/(console)/subscriptions/page.tsx",
    reason:
      "Admin cookie-based auth (verifyAdminSession) always redirects during instant validation; redirect() propagates through Suspense and prevents static shell render.",
    targetReviewDate: "2026-08-01",
    active: true,
  },
  {
    route: "app/admin/(console)/audit-logs/page.tsx",
    reason:
      "Admin cookie-based auth (verifyAdminSession) always redirects during instant validation; redirect() propagates through Suspense and prevents static shell render.",
    targetReviewDate: "2026-08-01",
    active: true,
  },
  {
    route: "app/admin/(console)/businesses/page.tsx",
    reason:
      "Admin cookie-based auth (verifyAdminSession) always redirects during instant validation; redirect() propagates through Suspense and prevents static shell render.",
    targetReviewDate: "2026-08-01",
    active: true,
  },
];
