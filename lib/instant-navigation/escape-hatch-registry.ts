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
 * Admin console pages previously required an escape hatch because their auth
 * used a custom JWT cookie (`verifyAdminSession` via `cookies()`) that always
 * redirected during instant validation. That auth was replaced with
 * database-backed Better Auth role authorization, which resolves the session
 * via `headers()` like every other authenticated dashboard route. The six
 * admin console routes now ship `instant` config blocks
 * and no longer require an exemption.
 */
export const escapeHatchRegistry: EscapeHatchEntry[] = [];
