# Requo Architecture

## Summary

Requo uses a feature-oriented Next.js App Router architecture. The app is already beyond scaffold stage, so the goal is to extend the current structure rather than replace it.

The product direction is workflow-first:

- capture inquiries
- turn qualified inquiries into quotes
- share or send professional quotes
- follow up consistently
- track public quote views and customer responses

The subscription and billing model is business-based:

- A user belongs to one or more businesses
- A business is the top-level billing/subscription container
- Plans and entitlements apply at the business level

The app supports multiple service-business types through editable starter templates, but
the architecture should continue to favor shared workflow features over vertical-specific
branching.

## Target Folder Structure

```text
app/
  (marketing)/
  (auth)/
  (public)/
  account/
  businesses/
  invite/
  onboarding/
  verify-email/
  api/

components/
  ui/
  shell/
  shared/
  marketing/

features/
  account/
  ai/
  analytics/
  audit/
  auth/
  billing/
  businesses/
  business-members/
  calendar/
  customers/
  follow-ups/
  inquiries/
  memory/
  notifications/
  onboarding/
  quotes/
  settings/
  theme/

lib/
  ai/
  auth/
  billing/
  cache/
  db/
    schema/
  navigation/
  realtime/
  resend/
  supabase/
  env.ts
  files.ts
  action-state.ts

emails/
  templates/

scripts/
tests/
  unit/
  components/
  integration/
  e2e/
types/
docs/
  architecture/
  setup/
```

## Architectural Defaults

- Keep `app/` focused on routing, layouts, page composition, loading states, and route handlers.
- Keep business logic in `features/`, not in route files.
- Keep shared primitives in `components/ui/` and app chrome or layout wrappers in `components/shared/` and `components/shell/`.
- Keep provider-specific code in `lib/auth`, `lib/supabase`, `lib/resend`, `lib/ai`, and `lib/billing`.
- Keep database schema and relational modeling in `lib/db/schema`, with Drizzle migrations in `drizzle/`.

## State And Data Defaults

- Prefer server-first data flow: server components, Server Actions, cached query helpers, `router.refresh()`, and targeted Suspense boundaries before introducing client data infrastructure.
- Keep most UI state local to the feature component tree. Form drafts, dialogs, filters, editors, and transient interaction state should stay in component state unless the same workflow becomes difficult to manage across many siblings.
- Reuse the current two-layer cache pattern for hot server reads: inner `"use cache"` functions for cross-request caching plus `React.cache()` wrappers for within-request deduplication.
- Use cache tags and `revalidateTag()` for invalidation instead of layering a second app-wide cache on top of the existing Next.js 16 model.
- When client state must persist across navigations, prefer route state, existing preserved UI behavior, or feature-scoped browser storage before introducing a global store.

### Dependency Defaults

- `Zustand`: not an app-wide default. Only add it for a clearly bounded client workflow with real cross-component coordination pressure.
- `TanStack Query`: not a default data layer for this app. The current server-first query and invalidation model should remain primary. Consider it only for client-heavy islands that need background refetching, pagination cache management, or optimistic client coordination that becomes awkward with local state.
- `Redis`: not a baseline dependency. Postgres-backed persistence, Next cache primitives, and Supabase realtime are the default stack. Add Redis only for measured cross-instance needs such as high-volume rate limiting, distributed locks, queues, or pub/sub.

### Revisit Triggers

- Add a small feature-scoped store when a single client workflow accumulates excessive prop drilling or duplicated coordination logic.
- Reconsider a client query library if AI chat, notifications, or another interactive island starts carrying substantial manual cache bookkeeping, retry handling, or background refresh complexity.
- Reconsider Redis when DB-backed public rate limiting, idempotency, or cross-instance coordination becomes a measurable bottleneck under production traffic.

## Design System And UI Composition

- `DESIGN.md` is the canonical UI system.
- `app/globals.css` defines the semantic tokens, motion tokens, surfaces, and shared utility classes.
- Reuse shared wrappers such as `components/shared/dashboard-layout.tsx`, `components/shared/form-layout.tsx`, and `components/shared/page-header.tsx` before creating one-off layout patterns.
- Reuse `components/ui/*` primitives instead of building parallel styling systems.
- Treat remaining raw status colors and `space-y-*` stacks as legacy cleanup targets, not patterns for new work.

## Route And Feature Boundaries

- `(marketing)` owns the landing page and top-level marketing presentation.
- `(auth)` owns signup, login, forgot password, and reset password.
- `(public)` owns public inquiry and public quote response routes.
- `onboarding/` owns first-business creation after authentication.
- `businesses/` owns the businesses hub and business-scoped dashboard routes.
- `account/` owns profile and security settings.
- `api/` owns narrow route handlers for Better Auth, billing webhooks, public analytics, and authenticated asset access.

Feature responsibilities:

- `features/account`: profile, security, and account-owned asset flows.
- `features/ai`: AI router, prompts, message surfaces, and provider fallback behavior.
- `features/analytics`: conversion analytics, workflow analytics, and public page view tracking.
- `features/audit`: audit log writes and business audit queries.
- `features/auth`: auth forms, validation, and client UX.
- `features/billing`: checkout UI, billing status, upgrade/cancel actions, and business billing queries.
- `features/businesses`: business creation, guided starter templates, hub queries, and business overview composition.
- `features/business-members`: business role and invite flows.
- `features/calendar`: calendar event target authorization and related scheduling helpers.
- `features/customers`: customer presentation and customer-related utilities.
- `features/follow-ups`: follow-up scheduling, rescheduling, completion, skipping, and reminder workflows.
- `features/inquiries`: public intake, inquiry page presentation, inbox listing, notes, attachments, forms, and status changes.
- `features/memory`: business memory and knowledge items used by AI-assisted drafting.
- `features/notifications`: notification data and UI.
- `features/onboarding`: first-business onboarding flow and starter-template selection.
- `features/quotes`: quote editor, calculations, manual/Requo delivery, status transitions, public quote pages, response tracking, and post-acceptance state.
- `features/settings`: business identity, logo, notifications, public inquiry settings, inquiry page or form defaults, and other workflow settings.
- `features/theme`: product theme concerns.

## Auth, Data, And Security

- Better Auth is the only auth system. Do not introduce Supabase Auth.
- Better Auth creates authenticated users and server-side profiles. Onboarding creates the first business.
- Businesses own plans, entitlements, and usage limits.
- `business_members` controls business-level roles.
- Authenticated mutations should continue to use business-aware helpers such as `getBusinessActionContext`, `getOperationalBusinessActionContext`, and `getOwnerBusinessActionContext`.
- Drizzle queries are the current enforcement layer for business ownership and membership.
- SQL RLS helpers and policies exist in migrations, but the app does not currently set `app.current_user_id` on the database session, so runtime session-based RLS is not the primary app guard.
- Supabase storage access should remain server-side for private assets, with business checks before reads or downloads.
- Validate input boundaries with Zod and keep secrets server-only.

## Provider Boundaries

- Supabase: storage, uploads or downloads, and realtime-backed notification plumbing.
- Email: transactional delivery is centralized in `lib/email`, with Resend first and Mailtrap/Brevo fallback for retryable provider failures.
- AI providers: Groq, Gemini, and OpenRouter are routed server-side through `lib/ai`.
- Better Auth: sessions, password flows, and user lifecycle hooks.
- Polar: recurring card subscriptions in USD, hosted checkout, customer self-service portal, and refunds (merchant of record).

## Billing Architecture

- Subscriptions are account-scoped. Each user account has at most one `account_subscriptions` row.
- `businesses.plan` is a denormalized read cache. `account_subscriptions` is authoritative.
- All businesses owned by a user inherit the plan from the user's account subscription.
- `lib/billing/subscription-service.ts` is the single write path for subscription mutations and keeps `businesses.plan` in sync across all owned businesses.
- `lib/billing/webhook-processor.ts` records provider events in `billing_events` for idempotency.
- Polar is the only billing provider and handles recurring card subscriptions in USD as a merchant of record.
- Billing webhook route lives in `app/api/billing/polar/webhook/route.ts`. The customer self-service portal route is `app/api/billing/polar/customer-portal/route.ts`. The refund request route is `app/api/billing/refund/route.ts`.

## Testing Architecture

- `tests/unit/` covers validation schemas, parsing helpers, route authorization boundaries, plan access, and other deterministic logic.
- `tests/components/` is intentionally small and reserved for meaningful interactive UI behavior.
- `tests/integration/` uses Postgres-backed fixtures for access control, server actions, route handlers, billing webhooks, public analytics, inquiry submissions, follow-ups, and quote workflows.
- `tests/e2e/` uses Playwright for product-critical browser flows and smoke coverage.
- Avoid shallow rendering tests, brittle snapshots, and tests that only repeat implementation details.

## Verification Defaults

- Run `npm run check` for most code changes.
- Run `npm run test` for logic, validation, or component behavior changes.
- Run `npm run test:integration` for server actions, route handlers, authz, billing, or DB-backed changes.
- Run `npm run build` when routes, layouts, or system wiring change.
- Run relevant `npm run test:e2e:smoke` coverage when critical user-facing flows change; use `npm run test:e2e` for broader browser journeys.
- Keep `docs/setup/` aligned with actual env and runtime expectations.
- Keep README and setup docs aligned with the current starter-template names and the inquiry -> quote -> share/send -> follow-up -> viewed/accepted/rejected positioning.
