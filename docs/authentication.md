# Requo Authentication & Authorization

How identity, membership, and tenant boundaries work. Codebase is the source of truth.

## Provider and session model

- **Better Auth 1.7 is the only auth system** (`lib/auth/config.ts`, catch-all `app/api/auth/[...all]/route.ts`). Do not add Supabase Auth — Supabase clients disable session persistence (`persistSession: false`).
- Config: Drizzle adapter (Postgres, camelCase), email+password with verification, magic-link (kill-switch `DISABLE_MAGIC_LINK`), Google OAuth, `admin()` plugin, 7-day sessions, DB-backed rate limits with custom rules.
- Session access: `getSession()` / `requireUser()` in `lib/auth/session.ts` (re-exported by `lib/auth/server.ts`) via `auth.api.getSession(headers)`. Client: `lib/auth/client.ts`.
- Signup creates user + profile; onboarding creates the first business (`app/onboarding/page.tsx`); additional businesses are explicit flows (`app/(business)/new/`).
- Admin console lives at the `/admin` path (no subdomain) and is role-based (`user.role = "admin"`). Admins sign in through the normal Requo login, then visit `/admin` — there is no separate admin login. Identity resolution (`features/admin/access.ts`) trusts the session's `role = "admin"` fast path, then falls back to a fresh primary-key lookup (bypassing Better Auth's session `cookieCache`, which otherwise keeps serving the pre-promotion role until `updateAge` elapses and bounces recently promoted admins until they sign in again) and finally to the `ADMIN_EMAILS` allowlist (`scripts/bootstrap-admin.ts` promotes the same emails; banned users are always refused). Both gates (`requireAdminConsoleUser()` for `app/admin/layout.tsx`, `requireAdminUser()` for page bodies, queries, mutations, actions) reject identically: no session → `/login`; signed in without admin access → `forbidden()` (403). The gate runs **inside the layout's Suspense boundary, whose fallback renders nothing** — Next flushes that fallback before the session check resolves, so anything console-shaped placed there (a shell skeleton, a rail, nav labels) streams to non-admins. Do not `await` the gate in the layout body either: the console pages export `instant = true`, so this layout must render synchronously or Next reports `Could not validate "instant" because the target segment was prevented from rendering` for every console page.

## Middleware (`proxy.ts`) — no auth

`proxy.ts` never checks sessions. It does: `X-Robots-Tag: noindex` for non-public routes, `/` + `Accept: text/markdown` → `/api/public/markdown`, legacy `/account/profile|security` → `/{slug}/settings/profile`, and the `activeBusinessSlug` httpOnly cookie. All auth lives in layouts, actions, and route handlers.

## Authorization: membership and roles

Central helper: `getBusinessActionContext({ businessSlug, minimumRole = "staff", requireActiveBusiness })` (`lib/db/business-access.ts:518`). Flow: `requireUser()` → resolve business by slug (or slug-cookie fallback) via `business_members ⨝ businesses` + effective-plan overlay (fail-closed to `free`) → role check → business-state check. Returns `{ ok, user, businessContext }` or a typed failure (`insufficient_role`, `business_locked_by_plan`, …).

Wrappers: `getOwnerBusinessActionContext()` (owner + active), `getOperationalBusinessActionContext()` (manager + active), `getWorkspaceBusinessActionContext()` (staff + active), `getOwnerBusinessLifecycleActionContext()` (owner, inactive allowed). Role weights `owner 3 / manager 2 / staff 1` and predicates (`canManageBusinessAdministration()`, …) in `lib/business-members.ts`.

Ownership enforcement is two steps: (1) boundary check via the helpers above in every server action/route handler; (2) **scoped Drizzle predicates** — every business query includes `eq(table.businessId, businessContext.business.id)`. Backend permission tests are mandatory for business-scoped changes.

Plan ≠ role: roles may hide features; plans must only lock/paywall (see Entitlements below). A staff member on free sees paid features locked, not hidden.

## Tenant boundary

- Every business query filters by server-resolved `businessId`. Tools receive resolved context from the session — never LLM-provided, client-provided, or URL-derived tenant IDs.
- Private Storage access is server-side only (service-role client) and scoped to the active business; downloads go through authenticated route handlers (e.g. `app/api/inquiries/[id]/attachments/[attachmentId]/route.ts`).
- Owner Assistant tools scope by `businessId` (`features/owner-assistant/tools/*`); Agent tools scope by the session's `businessId` (`features/ai-agent/tools/*`).

## Customer / public access (no login)

Public routes authenticate by possession of unguessable tokens, not sessions:

| Surface | Token | Verification |
|---|---|---|
| Public quote page | `quotes.publicToken` | `hashOpaqueToken()` (HMAC-SHA256, `APP_TOKEN_HASH_SECRET` ?? `BETTER_AUTH_SECRET`) vs `publicTokenHash` (`features/quotes/token-storage.ts`, `lib/security/tokens.ts`) |
| Agent chat session | `ai_agent_sessions.publicToken` (64-hex, 24h expiry) | `loadSessionByToken` + business join (`features/ai-agent/session-service.ts`) |
| Team invites | `business_member_invites.token` / invite links | Hashed lookup, expiry-checked |

Public hardening: `lib/public-action-rate-limit.ts` (per-IP fingerprint fail-closed + per-business fail-open) over Upstash Redis sliding windows with DB fallback (`lib/rate-limit/redis-rate-limiter.ts`, `public_action_events` ledger); CSRF origin check (`lib/security/csrf.ts`, exempting auth/billing-webhook/public/inngest/push paths).

## Plan entitlements

Single source: `lib/plans/entitlements.ts` (`planFeatures`, `hasFeatureAccess(plan, feature)`, `getRequiredPlan(feature)`). Plans `free/pro/business`; effective plan via `getEffectivePlanForBusiness()` (status, cancellation, grace). UI gating via `features/paywall/` (`LockedAction`, `FeatureGate`, `PremiumContentBlur`, …) — never filter nav by plan, never `redirect()/notFound()` on plan alone, never inline upgrade divs. Server-side checks run before expensive work (DB writes, AI, embeddings, file processing) and return upgrade messaging without leaking data.

Assistant/Agent limits ride the same plans (`lib/ai/conversation-limits.ts`, `lib/ai/usage-limiter.ts`): Assistant daily messages (free 25 / pro 250 / business 1000); Agent monthly sessions (free 0 / pro 100 / business 500, 50 msgs/session, daily ceiling).

## Protecting a new route/action — checklist

1. Server action or route handler (never middleware/proxy) calls the appropriate `get*BusinessActionContext` with the minimum role.
2. Validate input with Zod first.
3. Scope every Drizzle query by `businessId`.
4. If plan-gated, check `hasFeatureAccess` server-side before expensive work.
5. Keep private asset access server-side; add integration test covering member vs non-member.
