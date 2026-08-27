<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next-specific code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Requo Agent Guide

## Canonical Sources

- `DESIGN.md` — canonical UI system, tokens, and shared utilities.
- `docs/architecture/requo-architecture.md` — current app structure and boundaries.
- `.agents/skills/requo-repo-guide/SKILL.md` — repo-specific working conventions.
- `app/globals.css`, `components/shared/*`, and `components/ui/*` — shared product UI.
- `lib/plans/entitlements.ts` and `features/paywall/README.md` — plan gating.

When these disagree with this guide, the code and `docs/architecture/` win — this file is a map, not the source of truth.

## Project Overview

Requo is an owner-led SaaS app for service businesses that handle inbound inquiries and custom quotes. The core workflow is:

1. **Capture** inquiries (public intake forms).
2. **Qualify and route** inquiries (duplicate detection, AI-assisted classification).
3. **Draft quotes** from qualified inquiries (AI-assisted generation, reusable quote library / products).
4. **Share or send** professional quotes (public link or Requo email delivery).
5. **Follow up** consistently (scheduled, auto, and AI-drafted messages).
6. **Track responses** — quote states: viewed, accepted, rejected, expired.

Supporting capabilities: public inquiry pages, public quote pages with response tracking, business-scoped dashboards, quote library / products catalog, AI-assisted drafting, business memory (RAG-backed context for AI drafts), analytics (conversion + workflow/operations), notifications (in-app + web push), data import/export, business membership and roles, subscription billing with plan entitlements, admin console, audit logging, and compliance tracking.

The product **does not** include jobs, invoicing, or a workflow-automation engine. Those were intentionally removed — see Product Constraints.

## Product Direction

- Prioritize the inquiry → quote → share/send → follow-up → accepted/rejected workflow across marketing, onboarding, defaults, and product copy.
- Support multiple business types through editable starter templates; do not over-specialize into one vertical.
- Lead with workflow value, not generic configurability. Prefer strong opinionated defaults over configuration surfaces.
- Templates and multi-business are capabilities that speed setup — not the primary positioning.

## Setup Commands

```bash
npm install       # Install dependencies
npm run dev:app   # Next.js dev server only (preferred for app work)
npm run dev       # App + Inngest dev + ngrok (for webhook/callback testing)
npm run dev:inngest  # Inngest dev server only
npm run build     # Production build
npm run start     # Start production server
```

## Repo Layout

### App Routes (`app/`)

```text
app/
├── (marketing)/      # Landing page, pricing, legal, privacy, terms
├── (auth)/           # Signup, login, forgot/reset password, check-email
├── (public)/         # Public inquiry intake + public quote response pages
├── (business)/
│   ├── new/          # Create new business
│   └── [businessSlug]/
│       ├── (main)/   # Dashboard routes (see below)
│       ├── preview/  # Quote/document previews
│       ├── print/    # Print-optimized views
│       └── settings/ # Business settings (~15 pages)
├── (checkout)/       # Account billing/checkout
├── admin/            # Admin console (subdomain-routed)
├── onboarding/       # First-business creation after signup
├── invite/[token]/   # Team invite acceptance
├── verify-email/     # Email verification handler
├── home/             # Authenticated home redirect
├── api/              # Route handlers (see below)
└── .well-known/      # Agent discovery, MCP, OAuth, OpenID, security.txt
```

Dashboard routes (`app/(business)/[businessSlug]/(main)/`): `home`, `inquiries`, `quotes`, `products` (quote library / pricing catalog), `follow-ups`, `forms` (inquiry form builder), `analytics`, `members`. There is no AI chat surface — AI is drafting-focused.

### Features (`features/`)

`app/` stays thin; product logic lives here (validation, queries, actions, mutations, feature UI).

| Feature | Purpose |
|---------|---------|
| `account/` | Profile, security, account settings |
| `admin/` | Admin console features |
| `ai/` | AI-assisted quote drafting, pricing retrieval, missing-info detection, prompts, actions |
| `analytics/` | Conversion + workflow analytics, scheduled reports, public view tracking |
| `audit/` | Audit log writes and business audit queries |
| `auth/` | Auth forms, validation, client UX |
| `billing/` | Checkout UI, billing status, upgrade/cancel actions, billing queries |
| `business-members/` | Business roles, invite flows, permission surfaces |
| `businesses/` | Business creation, guided starter templates, hub queries, overview |
| `customers/` | Customer presentation and utilities |
| `data-export/` | Business data export (inquiries, quotes, CSV) |
| `dev-tools/` | Development tools panel |
| `follow-ups/` | Follow-up scheduling, AI drafting, reminders, mutations, queries |
| `importer/` | Data import with AI-powered extraction |
| `inquiries/` | Public intake, inbox, notes, attachments, forms, qualification (duplicate detection), PDFs, reply snippets |
| `legal/` | Legal pages configuration and components |
| `memory/` | Business memory — extraction, chunking, embeddings, RAG retriever; grounds AI quote drafts |
| `notifications/` | In-app notification data and UI |
| `onboarding/` | First-business onboarding, starter-template selection |
| `paywall/` | Plan-gating components and paywall logic |
| `quotes/` | Quote editor, calculations, delivery, status transitions, public pages, response tracking, quote library / products |
| `settings/` | Business settings surfaces |
| `theme/` | Product theme concerns |

Per-feature `jobs/` folders (e.g. `features/quotes/jobs/`, `features/follow-ups/jobs/`) hold Inngest background-job code — not a "jobs" product feature.

### Libraries (`lib/`)

| Library | Purpose |
|---------|---------|
| `admin/` | Admin subdomain configuration |
| `ai/` | AI infrastructure: model registry, router, capacity selector, embeddings, token logger/cleanup, usage limiter, cache layers, request dedup, quality gate, input sanitizer, output filter, security events, strip-reasoning middleware, tool truncator |
| `app-shell/` | App shell utilities |
| `auth/` | Better Auth configuration and helpers |
| `billing/` | Subscription service, webhook processor, Polar products, refunds, feature gates, region detection, background jobs |
| `cache/` | Cache tag helpers (`shell-tags`, `business-tags`) |
| `db/` | Drizzle ORM connection + schema (21 domain modules) |
| `dev/` | Dev timing utilities (server-timing) |
| `email/` | Multi-provider email sending (Resend primary, Mailtrap/Brevo fallback) |
| `inngest/` | Inngest client, event types, send helper, background functions |
| `instant-navigation/` | Instant-navigation governance (stale-times, escape hatches, coverage) |
| `openrouter/` | OpenRouter provider integration |
| `optimistic/` | Optimistic ID helpers for CRUD UI |
| `pdf/` | PDF generation utilities |
| `plans/` | Plan definitions, entitlements, usage limits, usage tracking |
| `push/` | Web push notification infrastructure |
| `rate-limit/` | Rate-limiting helpers (Upstash-backed) |
| `resend/` | Resend email provider client |
| `routing/` | Routing helpers |
| `security/` | CSRF protection, token management |
| `seo/` | SEO route registry, robots configuration |
| `supabase/` | Supabase client (storage, realtime) |

Root `lib/` files: `action-state.ts`, `business-members.ts`, `csv.ts`, `env.ts`, `files.ts`, `public-action-rate-limit.ts`, `public-env.ts`, `slugs.ts`, `utils.ts`.

### Components (`components/`)

`ui/` (shadcn/ui primitives), `shell/` (command menu, navigation, sidebar), `shared/` (layout wrappers: `DashboardPage`, `PageHeader`, `DashboardSection`, `DashboardTableContainer`, `FormSection`, `FormActions`, `server-action-button`, `region-error-boundary`, `paywall`, …), `marketing/`, `integrations/`, `feedback/`, `seo/`.

### Other Directories

- `scripts/` — migrations, seeders, audit scripts, operational scripts.
- `tests/unit/`, `tests/components/`, `tests/integration/`, `tests/e2e/` — see Testing.
- `emails/templates/` — transactional email templates.
- `docs/` — `architecture/`, `setup/`, `support/`, `plans/`, `prompts/`.
- `drizzle/` — sequential SQL migration files.
- `types/` — shared TypeScript types.

### API Routes (`app/api/`)

```text
api/
├── account/        # Avatar, billing, OAuth avatar
├── admin/          # Admin login/logout
├── auth/[...all]/  # Better Auth catch-all
├── billing/polar/  # Webhook, customer portal
├── business/       # [slug] ops, check-slug, logo, follow-ups, notifications
├── cron/           # expire-quotes, expire-subscriptions, token-log-cleanup
├── dev/            # Dev tools (context, revalidate, routes, skeleton, switch-plan, timing)
├── inngest/        # Inngest webhook route
├── inquiries/[id]/ # Inquiry-specific operations
├── public/         # analytics tracking, business lookup, markdown discovery
└── push/           # Web push subscribe/unsubscribe
```

Analytics rollups/digests/reports run as Inngest cron functions, not `api/cron` routes. There is no `api/ai` route — AI runs through server actions and Inngest.

### Middleware (`proxy.ts`)

Next.js middleware; keep it to routing and headers only (no auth checks or heavy logic):

- Subdomain-based admin rewriting to `/admin`.
- `X-Robots-Tag` injection for authenticated routes.
- Markdown agent discovery (rewrites `/` → `/api/public/markdown` for `Accept: text/markdown`).
- Business slug cookie management for dashboard routing.

## Core Stack

- **Framework:** Next.js 16.3 App Router, React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui + radix-ui
- **Database:** Drizzle ORM 0.45 + PostgreSQL (Supabase)
- **Auth:** Better Auth 1.6
- **Storage/Realtime:** Supabase
- **Email:** Resend (primary), Mailtrap + Brevo (fallback)
- **AI:** Vercel AI SDK 6 + multi-provider routing (Groq, Cerebras, Gemini, Mistral, Cloudflare Workers AI, NVIDIA NIM, OpenRouter)
- **Billing:** Polar (subscriptions, merchant of record, multi-currency)
- **Background jobs:** Inngest (cron + event-driven)
- **Coordination:** Upstash Redis (rate limiting, dedup, cross-instance only)
- **Push:** Web Push (VAPID)
- **Charts:** Recharts · **Animation:** Framer Motion + Motion · **DnD:** @dnd-kit
- **Testing:** Vitest 4 + Playwright 1.59 + Testing Library + fast-check
- **Package manager:** npm · **Path alias:** `@/*` → project root · **Validation:** Zod 4

## Working Defaults

1. Inspect relevant existing files first; plan multi-step or architectural work before coding.
2. Prefer small, reviewable diffs over rewrites. Make minimal, surgical changes that preserve current patterns.
3. Keep `app/` thin; put product logic in `features/` or `lib/`.
4. Reuse existing utilities, shared wrappers, and semantic tokens before creating new patterns.
5. Prefer strong opinionated defaults over configuration. Avoid bloated settings and over-engineered abstractions.
6. Use concise, outcome-first copy. Empty states point to the next useful action.
7. Do not invent fake implementations if a real one can be built. Do not silently remove functionality.
8. Avoid unnecessary schema changes. Keep strict typing, responsive behavior, and accessibility intact.
9. Update tests when behavior changes. Run the relevant checks after code changes.
10. State assumptions clearly and summarize changed files plus follow-ups.

## Product Constraints

Do not add (unless explicitly requested): jobs / job lifecycle, invoicing, workflow-automation engine or visual builder, enterprise CRM positioning, field-service dispatch, scheduling/routing/payroll, marketplace features, mobile app flows, live chat as a product surface (Crisp is support-only), advanced team collaboration beyond owner-first flows, micro-vertical template sprawl, or over-engineered abstractions.

## Architecture, Auth, And Security

- Better Auth is the only auth system. **Do not add Supabase Auth.**
- Signup creates the user and profile. Onboarding creates the first business. Additional businesses come through the businesses hub.
- `app/` owns routes, layouts, loading states, and route handlers. `features/` owns validation, queries, actions, mutations, and feature UI. `lib/` owns auth, DB access, provider clients, env parsing, and shared utilities.
- Users must only access their own business data. Enforce ownership through scoped Drizzle queries and business-aware helpers (`getBusinessActionContext`, `getOperationalBusinessActionContext`, `getOwnerBusinessActionContext`).
- Validate all external input with Zod. Keep secrets server-only.
- Keep private (Supabase) asset access server-side and scoped to the active business.
- Public routes use rate limiting via `lib/public-action-rate-limit.ts` and `lib/rate-limit/`. CSRF and token management live in `lib/security/`.
- Prefer copy, defaults, and config-driven changes before schema or route changes when repositioning workflows.

### AI Architecture

- `features/ai/` is product-level: AI-assisted quote drafting (`quote-generator.ts`), pricing retrieval, missing-info detection, and modular prompt files in `features/ai/prompts/`. It is **not** a chat orchestrator — there is no tool-calling agent loop or AI chat product surface.
- `lib/ai/` is infrastructure: model registry, intelligent `router.ts`, capacity selector, embeddings, token logging, usage limiter, cache layers, request dedup, quality gate, input sanitizer, output filter, security event logging, and middleware (strip-reasoning, tool-truncator).
- Provider routing is server-side through `lib/ai/router.ts` (Groq, Cerebras, Gemini via `@ai-sdk/google`, Mistral, Cloudflare Workers AI, NVIDIA NIM, OpenRouter).
- AI usage is tracked and limited per business via `lib/ai/usage-limiter.ts` and `lib/plans/`.
- Background AI work runs through Inngest (e.g. `inquiry-qualified-ai-draft`).

### Billing Architecture

- Subscriptions are business-scoped; each business has at most one `business_subscriptions` row.
- `businesses.plan` is a denormalized read cache; `business_subscriptions` is authoritative.
- `lib/billing/subscription-service.ts` is the **single write path** for subscription mutations and keeps `businesses.plan` in sync. Do not bypass it or write `business_subscriptions` directly.
- `lib/billing/webhook-processor.ts` records provider events in `billing_events` for idempotency. `lib/billing/refunds.ts` is the single path for Polar refunds.
- Polar is the sole payment processor (merchant of record, recurring card subscriptions). Webhook: `app/api/billing/polar/webhook/route.ts`; portal: `app/api/billing/polar/customer-portal/route.ts`. Identity resolution maps Polar's `customer.externalId` (set to `business.id` at checkout) back to the business.
- Plans: `free`, `pro`, `business`. Effective plan resolves through `getEffectivePlanForBusiness()` (status, cancellation dates, grace periods).

### Entitlement-Visibility Architecture

**Core principle:** all features stay visible to all plans for discoverability. Paid features are visibly locked/paywalled when the plan lacks access. **Navigation is never hidden by plan — only by role.**

Rules:

1. **Never hide navigation by plan.** Dashboard/settings/command-menu/mobile nav show all items; filtering is role-based only.
2. **Show but lock paid features.** Free users see pro/business features locked with upgrade CTAs; pro users see business-tier features locked; business users see everything.
3. **Server-side enforcement is mandatory** and happens before expensive work (DB writes, AI, embeddings, file processing). UI restrictions must not be bypassable via direct endpoint calls. Return structured errors with upgrade messaging; never leak business data.

Entitlements live in `lib/plans/entitlements.ts` (single source of truth). Feature keys: `analyticsConversion`, `analyticsWorkflow`, `multipleForms`, `inquiryPageCustomization`, `emailTemplates`, `aiQuoteDrafting`, `quoteLibrary`, `knowledgeBase`, `exports`, `removeWatermark`, `followUps`, `autoFollowUps`, `members`, `auditLogs`. Access via `hasFeatureAccess(plan, feature)` / `getRequiredPlan(feature)`; labels/descriptions in `planFeatureLabels` / `planFeatureDescriptions`.

Server-side check:

```ts
import { hasFeatureAccess } from "@/lib/plans/entitlements";

if (!hasFeatureAccess(businessContext.business.plan, "members")) {
  return { error: "Your plan does not include team members. Upgrade to invite your team." };
}
```

UI gating — use the components in `features/paywall/` (see `features/paywall/README.md`); do not build parallel patterns or inline upgrade text:

- `LockedAction` — buttons/controls: transparent when unlocked; disabled + tooltip + upgrade popover when locked (always keyboard accessible).
- `FeatureGate` — `variant="action" | "block" | "page"` for controls, content sections, or full pages (optional `previewContent`).
- `PremiumContentBlur` — content blocks: renders children when unlocked, an upgrade card when locked (children not in DOM when locked).
- `FeaturePreviewPaywall` — full pages: real content when unlocked, preview + upgrade banner (or empty-state card) when locked.
- `UpgradePrompt`, `UsageLimitBanner` — supporting prompts.

```tsx
<LockedAction feature="members" plan={plan} upgradeAction={{ userId, businessId, businessSlug, currentPlan: plan }}>
  <Button>Invite team member</Button>
</LockedAction>
```

Anti-patterns: filtering nav items by plan; `redirect()`/`notFound()` based on plan alone; inline `Upgrade to unlock…` divs instead of paywall components. Instead: always render the page/nav, gate content with a paywall component.

**Role ≠ plan.** Role permissions (`canManageBusinessAdministration()`, `canManageOperationalBusinessSettings()`, …) *may* hide features. Plan restrictions must *not* — they lock/paywall. A staff member on free sees paid features locked, not hidden.

When adding a plan-gated feature: add the key + label + description to `entitlements.ts`, gate the UI with a paywall component, enforce server-side, and cover it with component tests (per-tier visibility, a11y) and integration tests (server rejection, immediate plan transitions).

### Background Jobs (Inngest)

- `lib/inngest/` owns the client, event types (`events.ts`), send helper, and functions (`functions/cron.ts`, `functions/events.ts`, `functions/knowledge.ts`). Feature-level jobs live in `features/*/jobs/`.
- **Cron:** follow-up reminders, auto follow-ups, quote-viewed follow-ups, quote-expiring-soon, auto-archive stale inquiries, expire quotes, expire subscriptions, analytics rollup / digest / scheduled reports / benchmarks.
- **Event-driven:** push on inquiry received / quote sent / quote response, enable quote auto-follow-up, `inquiry-qualified-ai-draft`.
- Webhook route: `app/api/inngest/route.ts`. Dev: `npm run dev:inngest`.

### Database & Migrations

- Drizzle ORM with sequential SQL migrations in `drizzle/`; one migration history across all environments.
- Schema source of truth: `lib/db/schema/index.ts` (barrel over 21 domain modules): activity, admin, ai, analytics, audit, auth, business-inquiry-forms, businesses, compliance, email, follow-ups, inquiries, knowledge-files, memories, notifications, public-actions, push-subscriptions, quote-library, quotes, reply-snippets, subscriptions.
- Runtime uses `DATABASE_URL` (pooler). Migrations use `DATABASE_MIGRATION_URL` (direct connection, port 5432); `drizzle.config.ts` and `scripts/migrate.ts` reject pooler URLs.
- **Dev:** edit schema → `npm run db:generate -- --name descriptive_name` → `npm run db:migrate` → commit migration + schema together.
- **Prod:** `vercel-build` runs `db:migrate:strict && next build` (apply only). Never `db:generate`/`db:push` against production. Never edit a committed migration — always add a new one.
- `npm run db:reset` drops and re-migrates a local DB (refuses remote by default). See `docs/database-migrations.md`.

### Performance & Caching

- **Two-layer caching.** Hot server reads use `React.cache()` (within-request dedup) around a `"use cache"` inner function (cross-request). Keep both layers.
- **Cache tags** via `lib/cache/shell-tags.ts` (user-scoped) and `lib/cache/business-tags.ts` (business-scoped). Add `revalidateTag()` in mutations that change cached data.
- Parallelize independent fetches with `Promise.all`. Stream non-blocking data via `<Suspense>` async server components; don't add blocking awaits in layouts for page-specific data.
- Use `timed()` / `devTiming()` from `lib/dev/server-timing.ts` for dev latency (no-ops in prod).
- Do not use `next/dynamic` for server components (client-only interactive components only). Upstash Redis is for cross-instance concerns, not a general cache.

### Instant Navigation

All authenticated dashboard pages use the `unstable_instant` route segment config so sibling navigation paints the destination shell without a server roundtrip.

```tsx
export const unstable_instant = {
  prefetch: "static",
  samples: [{ params: { businessSlug: "demo" }, headers: [["rsc", "1"], ["next-action", null]] }],
};

export default function SomePage({ params }) {         // MUST be synchronous
  return (
    <DashboardPage>
      <PageHeader title="..." />
      <Suspense fallback={<Skeleton />}>
        <DataRegion params={params} />
      </Suspense>
    </DashboardPage>
  );
}

async function DataRegion({ params }) {                // all dynamic reads live here
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  // ...queries and rendering
}
```

Rules: pages return their shell + skeletons **synchronously**; `params`/`searchParams`/session/queries go inside `<Suspense>`-wrapped async children; each independently-loading region gets its own boundary, and independently-failing regions add `<RegionErrorBoundary>`. `unstable_instant` must include `samples`. Never re-add `unstable_disableValidation: true` — use the escape-hatch registry (`lib/instant-navigation/escape-hatch-registry.ts`). Stale times (`next.config.ts`): `experimental.staleTimes = { dynamic: 30, static: 180 }`. Source of truth: `node_modules/next/dist/docs/` (`instant-navigation.md`, `instant.md`, `prefetching.md`, `staleTimes.md`).

## Testing

- `tests/unit/` — validation schemas, parsing helpers, route authorization, plan access, deterministic logic.
- `tests/components/` — meaningful interactive UI behavior only (intentionally small; no shallow renders or brittle snapshots).
- `tests/integration/` — Postgres-backed: access control, server actions, route handlers, billing webhooks, public analytics, inquiry/follow-up/quote workflows, quote status transitions.
- `tests/e2e/` — Playwright: sign-in, non-member denial, public inquiry submission, quote creation/sending, public quote response.

Test behavior and product risk, not implementation details. Backend permission tests are mandatory for business-scoped behavior. Property-based testing available via `fast-check`.

```bash
npm run test              # Unit + component (sequential)
npm run test:unit
npm run test:components
npm run test:integration  # DB-backed
npm run test:e2e:smoke    # @smoke Playwright
npm run test:e2e          # Full Playwright suite
npm run test:all
npm run test:coverage
```

## UI Rules

- Follow `DESIGN.md`; do not invent a new visual language.
- Reuse shared wrappers (`DashboardPage`, `PageHeader`, `DashboardSection`, `DashboardTableContainer`, `FormSection`, `FormActions`) and `components/ui/*` primitives (`Button`, `Card`, `Empty`, `Alert`, `Badge`, `Sheet`, `Dialog`) before custom markup.
- Prefer semantic tokens/utilities: `surface-*`, `control-*`, `overlay-*`, `table-*`, `meta-label`, `hero-panel`, `section-panel`, `soft-panel`.
- Keep the UI calm, modern, minimalist, polished, and practical. Messaging is concise and outcome-first. Empty states point to the next useful action. Templates feel opinionated but editable.
- Avoid raw palette utilities, noisy decoration, random gradients, flashy animation, and page-by-page primitive restyling.
- Legacy raw status colors and `space-y-*` stacks are cleanup debt, not patterns for new work.
- For optimistic CRUD, use the shared stack (`hooks/use-animated-list.ts`, `hooks/use-optimistic-mutation.ts`, `components/shared/server-action-button.tsx`, `lib/optimistic/id.ts`) — see the repo guide skill.

## Done Means

1. The requested slice is implemented and lightweight, consistent with current architecture and the design system.
2. Messaging stays aligned with the owner-led service-business ICP and the inquiry → quote → share/send → follow-up → accepted/rejected workflow.
3. Onboarding stays guided through a few starter paths; templates and defaults stay opinionated but editable.
4. Relevant lint/type/build/test checks are run or explicitly called out.
5. Assumptions and follow-ups are stated; touched files are summarized.

## Verification

- **Docs/instructions:** read-through + targeted grep checks.
- **Most code changes:** `npm run check` (lint + typecheck + SEO audits).
- **Logic/component/validation:** also `npm run test`.
- **Server actions, route handlers, authz, billing, DB-backed:** `npm run test:integration`.
- **Routes/layouts/system wiring:** also `npm run build`.
- **Covered user flows:** relevant `npm run test:e2e:smoke` (or `npm run test:e2e` for broader journeys).
- **After schema changes:** `npm run db:generate -- --name descriptive_name` then `npm run db:migrate` first. Refresh demo/e2e fixtures with `npm run db:migrate` + `npm run db:seed-demo`.
- Vercel owns preview/production deploys via Git integration.

Pre-push baseline: `npm run check` → `npm run test` → `npm run test:integration` → `npm run build` → `npm run test:e2e:smoke`.

**SEO audits** (`npm run check:seo`): loading coverage, image priority, metadata uniqueness, use-cache purity, image usage, use-client placement, next-dynamic comments.

## Environment Variables

Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. See `.env.example` for the full list. Provider groups:

- **Database:** `DATABASE_URL` (pooler), `DATABASE_MIGRATION_URL` (direct)
- **Auth:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Email:** `RESEND_API_KEY`, `MAILTRAP_API_TOKEN`, `BREVO_API_KEY`, `EMAIL_DOMAIN`, `EMAIL_FROM_*`
- **AI:** `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `NVIDIA_NIM_API_KEY`
- **Billing:** `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`, `POLAR_*_PRODUCT_ID`
- **Push:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- **Inngest:** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- **Admin:** `ADMIN_EMAILS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Agent Discovery & MCP

`.well-known` routes: `agent-skills/`, `api-catalog/`, `mcp/`, `oauth-authorization-server/`, `oauth-protected-resource/`, `openid-configuration/`, `security-txt/`. Requests to `/` with `Accept: text/markdown` are rewritten to `/api/public/markdown`.
