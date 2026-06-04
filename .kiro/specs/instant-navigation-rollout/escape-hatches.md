# Escape Hatch Registry

## Purpose

An **escape hatch** is a controlled, per-route, tracked exemption from instant-navigation validation. It allows a single dashboard route to bypass `unstable_instant` validation temporarily when that route genuinely cannot be made instant within its current rollout phase.

Escape hatches are never silent — every exemption requires a documented reason and a target review date by which the exemption must be resolved.

## Schema

Each escape-hatch entry carries the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `route` | `string` | Exactly one in-scope route path (e.g. `app/(business)/[businessSlug]/settings/billing/page.tsx`) |
| `reason` | `string` | Non-empty human justification for why the route cannot be instant this phase |
| `targetReviewDate` | `string` | ISO date (`YYYY-MM-DD`) by which the exemption must be removed |
| `active` | `boolean` | Whether the exemption is still applied |

## Validation Rules

Entries must be validated via `validateEscapeHatch` (in `lib/instant-navigation/escape-hatches.ts`) before being added to the registry. The validator enforces:

1. The `route` must resolve to exactly one in-scope route (from `IN_SCOPE_ROUTES`)
2. The `reason` must be non-empty (not blank or whitespace-only)
3. The `targetReviewDate` must be a valid `YYYY-MM-DD` calendar date
4. Each escape hatch targets a single route — multi-route exemptions are rejected

An entry that reaches its `targetReviewDate` without being removed is flagged as **overdue** by `isEscapeHatchOverdue`.

## Active Escape Hatches

| Route | Reason | Target Review Date | Active |
|-------|--------|--------------------|--------|
| `app/admin/(console)/page.tsx` | Admin cookie-based auth (`verifyAdminSession` via `cookies()`) always redirects during instant validation; `redirect()` propagates through Suspense and prevents static shell render. | 2026-08-01 | ✅ |
| `app/admin/(console)/system/page.tsx` | Same as above — admin cookie auth redirect. | 2026-08-01 | ✅ |
| `app/admin/(console)/users/page.tsx` | Same as above — admin cookie auth redirect. | 2026-08-01 | ✅ |
| `app/admin/(console)/subscriptions/page.tsx` | Same as above — admin cookie auth redirect. | 2026-08-01 | ✅ |
| `app/admin/(console)/audit-logs/page.tsx` | Same as above — admin cookie auth redirect. | 2026-08-01 | ✅ |
| `app/admin/(console)/businesses/page.tsx` | Same as above — admin cookie auth redirect. | 2026-08-01 | ✅ |

## Phase Review Notes

### Phase 4 (admin, onboarding, new-business, businesses hub)

**Result: Admin console pages require escape hatches.**

All Phase 4 routes were reviewed:

- **Admin console pages** (`page`, `system`, `users`, `subscriptions`, `audit-logs`, `businesses`): The structural `<Suspense>` + child server component pattern is applied correctly. However, the admin auth gate (`requireAdminUser` → `verifyAdminSession`) reads the `admin-session` cookie directly via `cookies()` and calls `redirect("/login")` when no valid session is present. During build-time instant validation, no valid JWT can be provided in samples (it requires runtime signing with `BETTER_AUTH_SECRET`). Since `redirect()` propagates through Suspense boundaries, the static shell cannot be rendered for validation. **Escape hatches applied** with `unstable_instant = false` and tracked for review by 2026-08-01.
- **Onboarding page**: Uses `requireSession()` (which goes through `connection()` → `headers()` → Better Auth session resolution). This properly suspends during validation and the static shell renders. ✅ No escape hatch needed.
- **New-business page**: Already uses `<Suspense fallback={<NewBusinessPageSkeleton />}>` wrapping `<NewBusinessPageContent />`. ✅ No escape hatch needed.
- **Businesses hub** (`app/(business)/[businessSlug]/page.tsx`): A simple redirect page — no content to render or validate. ✅ No escape hatch needed.

**Resolution path for admin pages:** Refactor admin auth to use `headers()`-based session resolution (consistent with Better Auth pattern used by business routes) or wait for Next.js to support cookie-sample validation with runtime-signed tokens.
