# Requo Architecture

## Summary

Requo uses a feature-oriented Next.js App Router architecture. The app is already beyond scaffold stage, so the goal is to extend the current structure rather than replace it.

The product direction is workflow-first:

- capture inquiries
- qualify leads
- send professional quotes
- follow up consistently

The subscription and billing model is workspace-based:

- A user belongs to one or more workspaces
- A workspace is the top-level billing/subscription container
- A workspace can contain one or more businesses
- Plans and entitlements apply at the workspace level
- Businesses inherit workspace entitlements

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
  onboarding/
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
  auth/
  businesses/
  customers/
  inquiries/
  knowledge/
  notifications/
  onboarding/
  quotes/
  settings/
  theme/

lib/
  auth/
  cache/
  db/
    schema/
  navigation/
  openrouter/
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
- Keep provider-specific code in `lib/auth`, `lib/supabase`, `lib/resend`, and `lib/openrouter`.
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
- `api/` owns narrow route handlers for Better Auth and authenticated asset access.

Feature responsibilities:

- `features/account`: profile, security, and account-owned asset flows.
- `features/auth`: auth forms, validation, and client UX.
- `features/businesses`: business creation, guided starter templates, hub queries, and business overview composition.
- `features/customers`: customer presentation and customer-related utilities.
- `features/inquiries`: public intake, inquiry page presentation, inbox listing, notes, attachments, forms, and status changes.
- `features/knowledge`: FAQs and uploaded knowledge files.
- `features/notifications`: notification data and UI.
- `features/onboarding`: first-business onboarding flow and starter-template selection.
- `features/quotes`: quote editor, delivery, reminders, and public quote response.
- `features/settings`: business identity, logo, notifications, public inquiry settings, inquiry page or form defaults, and other workflow settings.
- `features/ai`, `features/analytics`, and `features/theme`: assistant, reporting, and theme concerns.

## Auth, Data, And Security

- Better Auth is the only auth system. Do not introduce Supabase Auth.
- Better Auth creates authenticated users and server-side profiles. Onboarding creates the first workspace and business; later business creation adds to the existing workspace.
- Workspaces own plans, entitlements, and usage limits. Businesses inherit these from their workspace.
- `workspace_members` controls workspace-level access; `business_members` controls business-level roles.
- Authenticated mutations should continue to use business-aware helpers such as `getOwnerBusinessActionContext`.
- Drizzle queries are the current enforcement layer for business ownership and membership.
- SQL RLS helpers and policies exist in migrations, but the app does not currently set `app.current_user_id` on the database session, so runtime session-based RLS is not the primary app guard.
- Supabase storage access should remain server-side for private assets, with business checks before reads or downloads.
- Validate input boundaries with Zod and keep secrets server-only.

## Provider Boundaries

- Supabase: storage, uploads or downloads, and realtime-backed notification plumbing.
- Resend: transactional email only.
- OpenRouter: server-side AI drafting only.
- Better Auth: sessions, password flows, and user lifecycle hooks.

## Verification Defaults

- Run `npm run lint` and `npm run typecheck` for most code changes.
- Run `npm run build` when routes, layouts, or system wiring change.
- Run relevant `npm run test:e2e` coverage when user-facing flows change.
- Keep `docs/setup/` aligned with actual env and runtime expectations.
- Keep README and setup docs aligned with the current starter-template names and the inquiry -> qualification -> quote -> follow-up positioning.
