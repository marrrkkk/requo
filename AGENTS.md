<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next-specific code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Requo Agent Guide

## Canonical Sources

- `DESIGN.md` is the canonical UI system.
- `.agents/skills/requo-repo-guide/SKILL.md` contains repo-specific working conventions.
- `docs/architecture/requo-architecture.md` describes the current app structure.
- `app/globals.css`, `components/shared/*`, and `components/ui/*` define the shared product UI.

## Project

Requo is an owner-led SaaS app for service businesses that handle inbound inquiries and custom quotes. The shared product workflow is:

1. capture inquiries,
2. turn qualified inquiries into quotes,
3. share or send professional quotes,
4. follow up consistently,
5. track viewed, accepted, rejected, expired, and voided quote states.

The app also handles public inquiry intake, public quote pages, business-scoped dashboards, manual and Requo email quote delivery, follow-up tasks, analytics, notifications, knowledge files, AI-assisted drafts, transactional email, workspace membership, and workspace-level subscription billing.

## Product Direction

- Prioritize the inquiry -> quote -> share/send -> follow-up -> viewed/accepted/rejected tracking workflow across marketing, onboarding, defaults, and in-app product copy.
- Support multiple business types through editable starter templates.
- Do not over-specialize into a single vertical.
- Lead with workflow value, not generic configurability.
- Templates should speed up onboarding and setup; they are not the main positioning.
- Multi-business is a capability, not the primary marketing story.

## Repo Layout

- `app/` owns routes, layouts, loading states, route handlers, and page composition.
- `components/` owns shared UI primitives, app shell, marketing UI, and reusable wrappers.
- `features/` owns product logic, validation, queries, actions, mutations, and feature-specific UI.
- `lib/` owns auth, database access, provider clients, env parsing, and shared utilities.
- `lib/billing/` owns billing domain types, plan pricing, region detection, subscription service, webhook processing, and provider clients.
- `features/billing/` owns checkout UI, billing status, server actions, and billing-related queries.
- `features/follow-ups/` owns follow-up scheduling, reminders, and lifecycle mutations.
- `features/workspaces/`, `features/workspace-members/`, and `features/business-members/` own workspace and business permission surfaces.
- `features/analytics/` owns conversion/workflow analytics and public view tracking.
- `features/audit/` owns audit log writes and reads for sensitive workspace actions.
- `scripts/` owns migrations, seeders, and operational scripts.
- `tests/unit/`, `tests/components/`, and `tests/integration/` own fast automated confidence for logic, UI, and server behavior.
- `tests/e2e/` owns Playwright coverage for user flows.

### Core Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS v4 and shadcn/ui
- Drizzle ORM with PostgreSQL
- Better Auth for authentication and sessions
- Supabase for storage and realtime-backed plumbing
- Resend for transactional email
- AI provider routing through Groq, Gemini, and OpenRouter
- PayMongo for QRPh payments (Philippines)
- Paddle for card/global payments

## Working Defaults

1. Inspect relevant existing files first.
2. Plan before coding when the work is multi-step or architectural.
3. Prefer small, reviewable diffs over rewrites.
4. Keep `app/` thin and move product logic into `features/` or `lib/`.
5. Reuse existing utilities, shared wrappers, and semantic tokens before creating new patterns.
6. Prefer strong defaults over excessive configuration.
7. Keep onboarding guided and editable later.
8. Use concise, outcome-first copy. Empty states should point users to the next useful action.
9. Avoid bloated settings experiences.
10. Do not invent fake implementations if a real one can be built.
11. Make minimal, surgical changes and preserve current architecture patterns.
12. Avoid unnecessary schema changes and unnecessary abstractions.
13. Keep strict typing, responsive behavior, and accessibility intact.
14. Update tests when behavior changes.
15. Do not silently remove existing functionality.
16. Mention assumptions clearly and summarize changed files plus follow-ups.
17. Run the relevant checks after code changes.

## Product Constraints

Do not add:

- enterprise CRM positioning
- field-service dispatch workflows
- marketplace features
- mobile app flows
- live chat
- advanced team collaboration beyond owner-first flows
- dozens of micro-vertical templates
- scheduling, routing, payroll, or invoicing unless already present or explicitly requested
- advanced RAG infrastructure unless explicitly requested
- over-engineered abstractions

## Architecture, Auth, And Security

- Better Auth is the only auth system. Do not add Supabase Auth.
- Signup creates the user and profile. Onboarding creates the first business. Additional businesses come through the businesses hub.
- `app/` owns routes, layouts, loading states, and route handlers.
- `features/` owns validation, queries, actions, mutations, and feature UI.
- `lib/` owns auth, database access, provider clients, env parsing, and shared utilities.
- Users must only access their own business data.
- Validate all external input with Zod.
- Keep private asset access server-side and scoped to the active business context.
- Prefer copy, defaults, and config-driven changes before schema or route changes when repositioning product workflows.

### Billing Architecture

- Subscriptions are workspace-scoped. Each workspace has at most one `workspace_subscriptions` row.
- The `workspaces.plan` column is a denormalized read cache. The authoritative state lives in `workspace_subscriptions`.
- `lib/billing/subscription-service.ts` is the single write path for all subscription mutations. It keeps `workspaces.plan` in sync.
- `lib/billing/webhook-processor.ts` provides idempotent event deduplication using `billing_events`.
- PayMongo handles QRPh (one-time payment intents, manual renewal). Paddle handles recurring card subscriptions.
- Webhook routes live at `app/api/billing/paymongo/webhook/route.ts` and `app/api/billing/paddle/webhook/route.ts`.
- Plan access is resolved through `getEffectivePlan()` in the subscription service, which checks subscription status, cancellation dates, and grace periods.
- Do not bypass the subscription service or write directly to `workspace_subscriptions`.

### Performance & Caching

- **Two-layer caching pattern.** High-frequency queries use `React.cache()` for within-request deduplication AND a `"use cache"` inner function for cross-request caching. Keep both layers — they serve different purposes.
- **Shell-level queries** (`getThemePreferenceForUser`, `getAccountProfileForUser`, `getBusinessMembershipsForUser`, `getBusinessContextForMembershipSlug`, `getWorkspacesForUser`, `getWorkspaceContextForUser`) are cached with `"use cache"` + `cacheTag` via `lib/cache/shell-tags.ts`. When adding new shell-level queries, follow the same pattern: inner `"use cache"` function + `React.cache()` wrapper.
- **Cache tags** use the scoping helpers in `lib/cache/shell-tags.ts` (user-scoped) and `lib/cache/business-tags.ts` (business-scoped). New cached queries should use the appropriate existing tag helpers. Add `revalidateTag()` calls in mutation actions that change cached data.
- **Parallelize independent data fetches.** Use `Promise.all` to run queries that do not depend on each other. Common pattern: start independent queries before an `await` and collect them later. Only chain `await` when a subsequent query needs results from a prior one.
- **Stream non-blocking data via Suspense.** Layout-level data that is not required for the shell (e.g., billing, upgrade buttons) should be rendered inside `<Suspense>` as async server components. Only session and auth-gate data should block shell render.
- **Do not add blocking awaits in layouts** for data that only a specific page needs. Push page-specific data into the page component itself.
- **Dev timing.** Use `timed()` or `devTiming()` from `lib/dev/server-timing.ts` to measure server-side latency in development. These helpers are no-ops in production.
- **Do not use `next/dynamic` for server components.** Reserve `next/dynamic` for client-only interactive components like AI panels and command menus that should not increase initial bundle size.

## Testing Priorities

- Test behavior and product risk, not implementation details.
- Backend permission tests are mandatory for business-scoped and workspace-scoped behavior.
- Keep schema tests focused on external input boundaries that protect inquiry creation, quote creation, public quote responses, billing, and critical route handlers.
- Keep integration tests DB-backed for access control, workflow mutations, quote status transitions, public analytics, billing webhooks, and server actions.
- Keep component tests only when they exercise meaningful user interaction or auth/payment state. Avoid shallow render tests and brittle snapshots.
- Keep Playwright coverage focused on smoke workflows: sign-in, non-member denial, public inquiry submission, quote creation/sending, and public quote response.

## UI Rules

- Follow `DESIGN.md`. Do not invent a new visual language.
- Reuse shared wrappers such as `DashboardPage`, `PageHeader`, `DashboardSection`, `DashboardTableContainer`, `FormSection`, `FormActions`, `FieldGroup`, `Field`, `Button`, `Card`, `Empty`, `Alert`, `Badge`, `Sheet`, and `Dialog` before custom markup.
- Prefer semantic tokens and utilities such as `surface-*`, `control-*`, `overlay-*`, `table-*`, `meta-label`, `hero-panel`, `section-panel`, and `soft-panel`.
- Keep the UI calm, modern, minimalist, polished, and practical.
- Keep messaging concise and practical. Favor clear workflow and outcome language over generic flexibility language.
- Empty states should point to the next useful action.
- Keep onboarding focused on a few guided starter paths and allow deeper editing later.
- Templates should feel opinionated but editable.
- Avoid raw palette utilities, noisy decoration, random gradients, flashy animation, and page-by-page primitive restyling.
- Legacy raw status colors and `space-y-*` stacks still exist in older files. Treat them as cleanup debt, not patterns for new work.

## Done Means

A task is done when:

1. the requested slice is implemented,
2. messaging is clearer and aligned with the owner-led service business ICP,
3. the workflow emphasis stays on inquiry -> quote -> share/send -> follow-up -> viewed/accepted/rejected tracking,
4. onboarding remains guided through a few starter business paths,
5. templates and defaults are more opinionated but still editable,
6. the implementation stays lightweight, maintainable, and consistent with the current architecture and design system,
7. relevant lint, type, build, or end-to-end checks are run or explicitly called out,
8. assumptions and follow-ups are stated clearly,
9. touched files are summarized briefly.

## Verification

- Docs and instruction changes: do a read-through plus targeted grep checks.
- Most code changes: `npm run check` or run `npm run lint` plus `npm run typecheck`.
- Logic, component, or validation changes: also run `npm run test`.
- Server actions, route handlers, authz, billing, or DB-backed changes: run `npm run test:integration`.
- Route, layout, or system changes: also run `npm run build`.
- Covered user-flow changes: run the relevant `npm run test:e2e:smoke`; use `npm run test:e2e` when the change touches broader browser journeys.
- If demo data or e2e fixtures need refreshing, use `npm run db:migrate` and `npm run db:seed-demo` when the environment supports it.
- Secret-storage or reversible-credential changes may also require `npm run db:backfill-security-secrets` after keys are configured.
- Prefer `npm run dev:app` for app-only local work. `npm run dev` also starts `ngrok` for callback and webhook testing.
- Vercel owns preview and production deployment. GitHub Actions owns merge gates:
  - `verify`: lint, typecheck, unit/component tests, build
  - `server-tests`: Postgres-backed integration tests and Playwright smoke coverage
