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
- PayMongo: QRPh payment intents for Philippines/PHP checkout.
- Paddle: recurring card subscriptions for global/USD checkout.

## Billing Architecture

- Subscriptions are business-scoped. Each business has at most one `business_subscriptions` row.
- `businesses.plan` is a denormalized read cache. `business_subscriptions` is authoritative.
- `lib/billing/subscription-service.ts` is the single write path for subscription mutations and keeps `businesses.plan` in sync.
- `lib/billing/webhook-processor.ts` records provider events in `billing_events` for idempotency.
- PayMongo uses one-time QRPh payment intents and manual renewal. Paddle uses recurring card subscriptions.
- Billing webhook routes live in `app/api/billing/paymongo/webhook/route.ts` and `app/api/billing/paddle/webhook/route.ts`.

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
