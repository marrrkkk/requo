# QuoteFlow MVP Architecture

## Summary

QuoteFlow should continue using the existing feature-oriented structure in this repository. The repo is already beyond scaffold stage, so the goal is to harden and extend the current architecture rather than replace it with a new one.

## Target Folder Structure

```text
app/
  (marketing)/
  (auth)/
  (dashboard)/dashboard/
  (public)/
  api/

components/
  ui/
  shell/
  shared/
  marketing/

features/
  auth/
  inquiries/
  quotes/
  knowledge/
  ai/
  analytics/
  settings/
  workspaces/

lib/
  auth/
  db/
    schema/
  supabase/
  resend/
  openrouter/
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
- Keep business logic inside `features/`, not in route files.
- Keep shared primitives in `components/ui/` and shared app chrome in `components/shell/` and `components/shared/`.
- Keep provider-specific code in `lib/auth`, `lib/supabase`, `lib/resend`, and `lib/openrouter`.
- Keep database schema and relational modeling in `lib/db/schema`, with Drizzle migrations in `drizzle/`.

## Design System and Tokens

- Global design tokens live in `app/globals.css`.
- The app uses Tailwind v4 CSS variables for color, spacing surfaces, radii, sidebar colors, and chart colors.
- shadcn is configured in `components.json` with `radix-nova`, `neutral`, and CSS variable mode.
- Shared primitives such as Button, Card, Empty, Field, Sidebar, Badge, and Tooltip should continue to define the visual baseline.
- Product UI should compose these primitives rather than introducing parallel styling systems.

## Route and Feature Boundaries

- `(marketing)` owns the landing page and top-level marketing presentation.
- `(auth)` owns signup, login, forgot password, and reset password.
- `(dashboard)` owns authenticated product surfaces and uses a shared dashboard shell.
- `(public)` owns the public inquiry form and public quote response pages.
- `api/` owns narrow route handlers for Better Auth and authenticated asset downloads.

Feature responsibilities:

- `features/auth`: client-side auth forms, validation, and UX feedback.
- `features/inquiries`: public intake, inbox listing, notes, attachments, and status changes.
- `features/quotes`: quote editor, quote delivery, public quote response, and quote syncing.
- `features/knowledge`: FAQs and uploaded text knowledge files.
- `features/ai`: inquiry assistant prompts, context assembly, and model invocation.
- `features/analytics`: dashboard metrics and trend queries.
- `features/settings`: workspace identity, logo, notifications, public inquiry settings, and defaults.
- `features/workspaces`: overview cards and dashboard summary composition.

## Auth, Data, and Security

- Better Auth is the only auth system. Do not introduce Supabase Auth.
- Workspace bootstrap happens during Better Auth user creation and should remain server-side.
- Authenticated mutations should continue to go through workspace-aware helpers such as `getOwnerWorkspaceActionContext`.
- Drizzle queries are currently the primary enforcement mechanism for workspace ownership and membership.
- SQL RLS helpers and policies exist in migrations, but the app does not currently set `app.current_user_id` on the database session. That means runtime DB-session RLS is not fully activated for app queries yet.
- Supabase storage access should remain server-side for private assets. Public download routes should keep checking workspace context before reading from storage.

## Provider Boundaries

- Supabase: storage clients and download routes only, plus environment-backed project wiring.
- Resend: transactional email only.
- OpenRouter: server-side AI drafting only.
- Better Auth: sessions, password flows, and user lifecycle hooks.

## Near-Term Hardening Priorities

- Keep environment parsing aligned with the actual runtime env surface.
- Keep setup and deployment docs in `docs/setup/`.
- Expand smoke coverage for storage-backed and provider-backed flows without changing the architecture.
