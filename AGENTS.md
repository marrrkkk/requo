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

## Project Overview

Requo is an owner-led SaaS app for service businesses that handle inbound inquiries and custom quotes. The core product workflow is:

1. capture inquiries (public intake forms, AI-powered inquiry chat),
2. qualify and route inquiries (duplicate detection, AI classification),
3. turn qualified inquiries into quotes (AI-assisted draft generation),
4. share or send professional quotes (manual or Requo email delivery),
5. follow up consistently (scheduled, automated, AI-drafted messages),
6. track viewed, accepted, rejected, expired, and voided quote states,
7. convert accepted quotes into jobs,
8. invoice completed or in-progress jobs,
9. automate repetitive workflow steps through event-driven automation and visual workflow builder.

Supporting capabilities: public inquiry pages, public quote pages with response tracking, business-scoped dashboards, AI assistant with orchestration and tool use, knowledge base (RAG-backed memory), analytics (conversion, pipeline velocity, cohort), notifications (in-app + web push), data import/export, business membership and roles, subscription billing with plan entitlements, admin console, audit logging, and compliance tracking.

## Product Direction

- Prioritize the inquiry → quote → share/send → follow-up → accepted/rejected → job → invoice workflow across marketing, onboarding, defaults, and in-app product copy.
- Workflow automation supports both smart defaults and a visual workflow builder for advanced users.
- Support multiple business types through editable starter templates.
- Do not over-specialize into a single vertical.
- Lead with workflow value, not generic configurability.
- Templates speed up onboarding and setup; they are not the main positioning.
- Multi-business is a capability, not the primary marketing story.

## Setup Commands

```bash
npm install              # Install dependencies
npm run dev:app          # Start Next.js dev server only
npm run dev              # Start app + Inngest dev + ngrok (for webhooks)
npm run dev:inngest      # Start Inngest dev server separately
npm run build            # Production build
npm run start            # Start production server
```

## Repo Layout

### App Routes (`app/`)

```text
app/
├── (marketing)/       # Landing page, pricing, legal, privacy, terms
├── (auth)/            # Signup, login, forgot/reset password, check-email
├── (public)/          # Public inquiry intake, public quote response pages
├── (business)/
│   ├── new/           # Create new business
│   └── [businessSlug]/
│       ├── (main)/    # Dashboard routes (see below)
│       ├── automations/  # Workflow automation builder (full-page)
│       ├── preview/   # Quote/document previews
│       ├── print/     # Print-optimized views
│       └── settings/  # Business settings (20+ settings pages)
├── (checkout)/        # Account billing/checkout
├── admin/             # Admin console (subdomain-routed)
├── onboarding/        # First-business creation after signup
├── invite/[token]/    # Team invite acceptance
├── verify-email/      # Email verification handler
├── home/              # Authenticated home redirect
├── api/               # Route handlers (see below)
└── .well-known/       # Agent discovery, MCP, OAuth, OpenID, security.txt
```

Dashboard routes (`app/(business)/[businessSlug]/(main)/`):

- `home/` — business overview
- `inquiries/` — inbox, detail, notes, attachments
- `quotes/` — quote list, editor, delivery
- `follow-ups/` — follow-up management
- `jobs/` — job lifecycle
- `invoices/` — invoice management
- `analytics/` — conversion, pipeline, cohort
- `automations/` — automation rules list
- `assistant/` — AI assistant interface
- `chat/` — AI chat conversations
- `knowledge/` — knowledge base management
- `forms/` — inquiry form builder
- `members/` — team member management

### Features (`features/`)

| Feature | Purpose |
|---------|---------|
| `account/` | Profile, security, account settings |
| `admin/` | Admin console features |
| `ai/` | AI orchestrator, tools, prompts, chat UI, quote generator, context retrieval, action proposals, pipeline, task registry, conversation management |
| `analytics/` | Conversion analytics, pipeline velocity, cohort analysis, AI summary, rollup jobs, scheduled reports |
| `audit/` | Audit log writes and business audit queries |
| `auth/` | Auth forms, validation, client UX |
| `automations/` | Event-driven rules, 12 executor actions, visual workflow builder, condition evaluator, scheduler, failure tracker, templates, recommended automations |
| `billing/` | Checkout UI, billing status, upgrade/cancel actions, billing queries |
| `business-members/` | Business roles, invite flows, permission surfaces |
| `businesses/` | Business creation, guided starter templates, hub queries, routes |
| `customers/` | Customer presentation and utilities |
| `data-export/` | Business data export (inquiries, quotes, audit logs, automation logs) |
| `dev-tools/` | Development tools panel |
| `follow-ups/` | Follow-up scheduling, AI message drafting, mutations, queries |
| `importer/` | Data import with AI-powered extraction |
| `inquiries/` | Public intake, inbox, notes, attachments, forms, qualification (duplicate detection), AI-powered public inquiry chat, PDFs, reply snippets |
| `invoices/` | Invoice generation, PDF rendering, sending, queries |
| `jobs/` | Job creation from accepted quotes, lifecycle, queries |
| `legal/` | Legal pages configuration and components |
| `memory/` | Business knowledge files, RAG retriever, embeddings |
| `notifications/` | In-app notification data and UI |
| `onboarding/` | First-business onboarding, starter-template selection |
| `paywall/` | Plan-gating components and paywall logic |
| `quotes/` | Quote editor, calculations, delivery, status transitions, public pages, response tracking, quote library |
| `settings/` | Business settings surfaces |
| `theme/` | Product theme concerns |

### Libraries (`lib/`)

| Library | Purpose |
|---------|---------|
| `admin/` | Admin subdomain configuration |
| `ai/` | AI infrastructure: model registry, router, capacity selector, embeddings, token logger, usage limiter, cache layer, request dedup, quality gate, input sanitizer, output filter, security events, history summarizer, strip-reasoning middleware, tool truncator |
| `app-shell/` | App shell utilities |
| `auth/` | Better Auth configuration and helpers |
| `billing/` | Subscription service, webhook processor, Polar products, feature gates, region detection, billing types, background jobs |
| `cache/` | Cache tag helpers (shell-tags, business-tags) |
| `db/` | Drizzle ORM connection and schema (25 domain modules) |
| `dev/` | Dev timing utilities (server-timing) |
| `email/` | Multi-provider email sending (Resend primary, Mailtrap/Brevo fallback) |
| `inngest/` | Inngest client, event types, send helper, background functions (cron, event-driven) |
| `openrouter/` | OpenRouter provider integration |
| `optimistic/` | Optimistic ID helpers for CRUD UI |
| `pdf/` | PDF generation utilities |
| `plans/` | Plan definitions, entitlements, usage limits, usage tracking |
| `push/` | Web push notification infrastructure |
| `resend/` | Resend email provider client |
| `routing/` | Routing helpers |
| `security/` | CSRF protection, token management |
| `seo/` | SEO route registry, robots configuration |
| `supabase/` | Supabase client (storage, realtime) |

Root lib files: `env.ts`, `public-env.ts`, `files.ts`, `slugs.ts`, `utils.ts`, `csv.ts`, `action-state.ts`, `business-members.ts`, `public-action-rate-limit.ts`

### Components (`components/`)

| Directory | Purpose |
|-----------|---------|
| `ai-elements/` | AI-specific UI elements |
| `assistant-ui/` | assistant-ui library integration components |
| `feedback/` | User feedback components |
| `integrations/` | Integration-related components |
| `marketing/` | Marketing page components |
| `prompt-kit/` | Prompt/AI UI kit components |
| `seo/` | SEO-related components |
| `shared/` | Shared layout wrappers (DashboardPage, PageHeader, FormSection, etc.) |
| `shell/` | App shell (command menu, navigation, sidebar) |
| `ui/` | shadcn/ui primitives |

### Other Directories

- `scripts/` — migrations, seeders, audit scripts, operational scripts
- `tests/unit/`, `tests/components/`, `tests/integration/` — fast automated confidence
- `tests/e2e/` — Playwright coverage for user flows
- `emails/templates/` — transactional email templates
- `docs/` — architecture docs, setup guides, database migration reference
- `drizzle/` — sequential SQL migration files
- `types/` — shared TypeScript types

### API Routes (`app/api/`)

```text
api/
├── account/           # Avatar, billing, OAuth avatar
├── admin/             # Admin login/logout
├── ai/                # Chat, conversations, action execution
├── auth/[...all]/     # Better Auth catch-all
├── billing/polar/     # Webhook, customer portal
├── business/[slug]/   # Business-scoped operations, logo, follow-ups, notifications
├── cron/              # Analytics (benchmarks, digest, rollup, scheduled-reports),
│                      # automations, expire-quotes, expire-subscriptions
├── dev/               # Dev tools (context, revalidate, routes, skeleton, switch-plan, timing)
├── inngest/           # Inngest webhook route
├── inquiries/[id]/    # Inquiry-specific operations
├── public/            # Analytics tracking, business lookup, inquiry chat, markdown discovery
└── push/              # Web push subscribe/unsubscribe
```

### Middleware

- `proxy.ts` is the Next.js middleware file. It handles:
  - Subdomain-based admin rewriting to `/admin` route tree
  - `X-Robots-Tag` injection for authenticated routes
  - Markdown agent discovery (rewrites `/` to `/api/public/markdown` for `text/markdown` Accept header)
  - Business slug cookie management for dashboard routing
- Do not add auth checks or heavy logic to middleware. Keep it focused on routing and headers.

## Core Stack

- **Framework:** Next.js 16.2 App Router, React 19, TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui + radix-ui
- **Database:** Drizzle ORM 0.45 with PostgreSQL
- **Auth:** Better Auth 1.6
- **Storage:** Supabase (storage + realtime)
- **Email:** Resend (primary), Mailtrap and Brevo (fallback)
- **AI:** Vercel AI SDK 6 + assistant-ui 0.14 + multi-provider routing (Groq, Cerebras, Gemini, Mistral, Cloudflare Workers AI, NVIDIA NIM, OpenRouter)
- **Billing:** Polar (subscription billing, merchant of record, multi-currency)
- **Background jobs:** Inngest (cron, event-driven functions)
- **Caching:** Upstash Redis for rate limiting and cross-instance coordination
- **Push notifications:** Web Push (VAPID)
- **Workflow builder:** @xyflow/react (drag-and-drop canvas)
- **Charts:** Recharts
- **Animation:** Framer Motion + Motion
- **Drag-and-drop:** @dnd-kit
- **Testing:** Vitest 4 + Playwright 1.59 + Testing Library + fast-check
- **Package manager:** npm
- **Path alias:** `@/*` maps to project root

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
- live chat (Crisp is for support only, not product chat)
- advanced team collaboration beyond owner-first flows
- dozens of micro-vertical templates
- scheduling, routing, or payroll unless already present or explicitly requested
- complex branching automation UIs beyond what the workflow builder supports
- over-engineered abstractions

## Architecture, Auth, And Security

- Better Auth is the only auth system. Do not add Supabase Auth.
- Signup creates the user and profile. Onboarding creates the first business. Additional businesses come through the businesses hub.
- `app/` owns routes, layouts, loading states, and route handlers.
- `features/` owns validation, queries, actions, mutations, and feature UI.
- `lib/` owns auth, database access, provider clients, env parsing, and shared utilities.
- Users must only access their own business data.
- Validate all external input with Zod 4.
- Keep private asset access server-side and scoped to the active business context.
- Prefer copy, defaults, and config-driven changes before schema or route changes when repositioning product workflows.
- Public routes use rate limiting via `lib/public-action-rate-limit.ts`.
- CSRF protection and token management live in `lib/security/`.

### AI Architecture

- AI features are split between `features/ai/` (product-level) and `lib/ai/` (infrastructure).
- `lib/ai/` provides: model registry, intelligent router, capacity selector, embeddings, token logging, usage limiting, cache layer, request deduplication, quality gate, input sanitizer, output filter, security event logging, history summarizer, and middleware (strip-reasoning, tool-truncator).
- `features/ai/orchestrator/` provides: intent classifier, tool selector, memory retriever, conversation compressor, prompt builder, prompt cache, token allocation, and orchestration logger.
- `features/ai/tools/` provides: action tools, Vercel AI SDK tool definitions, executors, structured outputs, and tool metadata.
- `features/ai/prompts/` provides: modular prompt files for quote drafts, follow-up messages, form suggestions, inquiry summaries, quote improvements, and business memory summaries.
- AI assistant uses `@assistant-ui/react` for the chat interface with `components/assistant-ui/` and `components/prompt-kit/`.
- AI provider routing is server-side through `lib/ai/router.ts`. Supported providers: Groq, Cerebras, Gemini (via @ai-sdk/google), Mistral, Cloudflare Workers AI, NVIDIA NIM, and OpenRouter.
- AI usage is tracked and limited per business via `lib/ai/usage-limiter.ts` and `lib/plans/`.
- Background AI jobs run through Inngest (`features/ai/inngest/`).

### Billing Architecture

- Subscriptions are business-scoped. Each business has at most one `business_subscriptions` row.
- The `businesses.plan` column is a denormalized read cache. The authoritative state lives in `business_subscriptions`.
- Plans: `free`, `pro`, `business`. Entitlements are defined in `lib/plans/entitlements.ts`.
- `lib/billing/subscription-service.ts` is the single write path for all subscription mutations. It keeps `businesses.plan` in sync.
- `lib/billing/webhook-processor.ts` provides idempotent event deduplication using `billing_events`.
- Polar is the sole payment processor and handles recurring card subscriptions as a merchant of record.
- Webhook route lives at `app/api/billing/polar/webhook/route.ts`. Identity resolution maps Polar's `customer.externalId` (set to `business.id` at checkout) back to the owning business.
- Customer self-service portal: `app/api/billing/polar/customer-portal/route.ts`.
- Plan access is resolved through `getEffectivePlanForBusiness()` in the subscription service, which checks subscription status, cancellation dates, and grace periods.
- Feature gating uses `lib/billing/feature-gate.ts` and `lib/plans/entitlements.ts`. UI gating uses `features/paywall/`.
- Do not bypass the subscription service or write directly to `business_subscriptions`.

### Entitlement-Visibility Architecture

**Core Principle:** All features remain visible to all plans for discoverability. Paid features are visibly locked/paywalled when the current plan lacks access. Navigation is never hidden by plan — only by role.

#### Plan-Based Visibility Rules

1. **Navigation is NEVER hidden by plan**
   - Dashboard navigation, settings navigation, command menu, and mobile navigation show all items regardless of plan
   - Navigation filtering is role-based only (business member permissions)
   - Users can navigate to any feature page they have role permission to access

2. **Features are visible but locked/paywalled**
   - Free users see all pro/business features as locked with upgrade CTAs
   - Pro users see business-tier features as locked with upgrade CTAs
   - Business users see all features unlocked

3. **Server-side enforcement is mandatory**
   - All server actions and route handlers check plan entitlements
   - Users cannot bypass UI restrictions by calling endpoints directly
   - Plan checks happen before expensive operations (embeddings, AI, etc.)
   - Authorization failures return structured errors with upgrade messaging

#### Paywall Component System

**Location:** `features/paywall/`

Use the existing paywall components — do not create parallel patterns:

##### LockedAction

For buttons, links, and interactive controls that require a paid feature:

```tsx
import { LockedAction } from "@/features/paywall";

<LockedAction
  feature="members"
  plan={plan}
  upgradeAction={{
    userId: user.id,
    businessId,
    businessSlug,
    currentPlan: plan,
  }}
>
  <Button>Invite team member</Button>
</LockedAction>
```

**Behavior:**
- When unlocked: passes through children normally (transparent wrapper)
- When locked: shows disabled control with 50% opacity, tooltip on hover, opens upgrade popover on click
- Always visible and keyboard accessible

##### FeatureGate

Multi-variant component for different gating scenarios:

```tsx
import { FeatureGate } from "@/features/paywall";

// Action variant (for buttons/controls)
<FeatureGate feature="exports" plan={plan} variant="action" upgradeAction={props}>
  <Button>Export data</Button>
</FeatureGate>

// Block variant (for content sections)
<FeatureGate feature="analyticsConversion" plan={plan} variant="block" upgradeAction={props}>
  <AnalyticsChart data={data} />
</FeatureGate>

// Page variant (for full pages/features)
<FeatureGate 
  feature="members" 
  plan={plan} 
  variant="page" 
  upgradeAction={props}
  previewContent={<DemoMembersList />}  // optional
>
  <RealMembersList />
</FeatureGate>
```

**Variants:**
- `action`: Same as `LockedAction` (disabled control + popover)
- `block`: Shows upgrade card instead of content
- `page`: Shows preview + banner (if `previewContent` provided) OR empty-state upgrade card

##### PremiumContentBlur

For content blocks that should show an upgrade card when locked:

```tsx
import { PremiumContentBlur } from "@/features/paywall";

<PremiumContentBlur
  feature="analyticsConversion"
  plan={plan}
  upgradeAction={props}
>
  <AdvancedAnalyticsChart />
</PremiumContentBlur>
```

**Behavior:**
- When unlocked: renders children normally
- When locked: shows upgrade card with lock icon, feature label, plan badge, and CTA
- Children are NOT rendered in DOM when locked (secure)

##### FeaturePreviewPaywall

For full pages with optional preview content:

```tsx
import { FeaturePreviewPaywall } from "@/features/paywall";

<FeaturePreviewPaywall
  feature="analyticsConversion"
  plan={plan}
  previewContent={<DemoAnalyticsChart />}
  upgradeAction={props}
>
  <RealAnalyticsContent />
</FeaturePreviewPaywall>
```

**Behavior:**
- When unlocked: renders children normally
- When locked with preview: shows preview + "Demo data" badge + upgrade banner
- When locked without preview: shows empty-state upgrade card
- Real content is NOT rendered when locked (secure)

#### Server-Side Enforcement

**Location:** Server actions, route handlers, API routes

Every plan-gated feature MUST check entitlements server-side:

```tsx
import { hasFeatureAccess } from "@/lib/plans/entitlements";

export async function createKnowledgeEntryAction(/* ... */) {
  // Get business context (includes plan)
  const { businessContext } = await getBusinessActionContext({ /* ... */ });
  
  // Check plan entitlement BEFORE any expensive operations
  if (!hasFeatureAccess(businessContext.business.plan, "knowledgeBase")) {
    return {
      error: "Your plan does not include a knowledge base. Upgrade to Pro to access this feature.",
    };
  }
  
  // Continue with authorized operation...
}
```

**Requirements:**
- Use `hasFeatureAccess(plan, feature)` from `lib/plans/entitlements.ts`
- Check entitlements before expensive operations (DB writes, AI calls, file processing)
- Return structured errors with upgrade messaging
- Never leak business data in authorization failures
- Plan checks are immediate — no caching or delayed evaluation

#### Entitlement Definitions

**Location:** `lib/plans/entitlements.ts`

This is the single source of truth for feature-to-plan mappings:

```typescript
export const planFeatures = [
  "analyticsConversion",
  "analyticsWorkflow",
  "multipleForms",
  // ... all features
] as const;

export type PlanFeature = (typeof planFeatures)[number];

const planEntitlements: Record<BusinessPlan, ReadonlySet<PlanFeature>> = {
  free: new Set<PlanFeature>([
    "followUps",
    "aiQuoteDrafting",
    // ... free features
  ]),
  pro: new Set<PlanFeature>([
    // ... all free features + pro features
  ]),
  business: new Set<PlanFeature>([
    // ... all features
  ]),
};

export function hasFeatureAccess(plan: BusinessPlan, feature: PlanFeature): boolean {
  return planEntitlements[plan].has(feature);
}

export function getRequiredPlan(feature: PlanFeature): BusinessPlan | null {
  // Returns minimum plan required, or null if available on all plans
}
```

**Feature metadata:**
- `planFeatureLabels`: Human-readable feature names for UI
- `planFeatureDescriptions`: Value descriptions for upgrade prompts

#### Anti-Patterns (Do NOT Use)

❌ **Hiding navigation by plan:**
```tsx
// WRONG: Don't filter navigation items by plan
{hasFeatureAccess(plan, "members") && <NavItem href="/members">Members</NavItem>}
```

✅ **Correct: Always show navigation, lock destination:**
```tsx
// RIGHT: Show navigation item, lock page content if needed
<NavItem href="/members">Members</NavItem>  {/* Always visible */}

// On members page:
<FeatureGate feature="members" plan={plan} variant="page">
  <MembersList />
</FeatureGate>
```

❌ **Inline upgrade text without components:**
```tsx
// WRONG: Don't use raw divs with upgrade text
{!hasFeatureAccess(plan, "analytics") ? (
  <div>Upgrade to unlock analytics.</div>
) : (
  <AnalyticsContent />
)}
```

✅ **Correct: Use paywall components:**
```tsx
// RIGHT: Use proper paywall component
<PremiumContentBlur feature="analyticsConversion" plan={plan} upgradeAction={props}>
  <AnalyticsContent />
</PremiumContentBlur>
```

❌ **Route-level hiding:**
```tsx
// WRONG: Don't redirect or return not-found based on plan alone
if (!hasFeatureAccess(plan, "members")) {
  redirect(dashboardPath);  // Don't do this!
}
```

✅ **Correct: Show page with paywall:**
```tsx
// RIGHT: Render page structure, gate content
<DashboardPage>
  <PageHeader title="Team Members" />
  <FeatureGate feature="members" plan={plan} variant="page">
    <MembersList />
  </FeatureGate>
</DashboardPage>
```

#### Mixed-Access Pages

For pages with both free and paid content, render accessible sections normally and gate paid sections:

```tsx
<DashboardPage>
  <PageHeader title="Analytics" />
  
  {/* Free tier content - accessible to all */}
  <BasicAnalyticsSection data={basicData} />
  
  {/* Pro tier content - locked for free users */}
  <PremiumContentBlur feature="analyticsConversion" plan={plan} upgradeAction={props}>
    <AdvancedAnalyticsSection data={advancedData} />
  </PremiumContentBlur>
  
  {/* Business tier content - locked for free/pro users */}
  <FeatureGate feature="analyticsWorkflow" plan={plan} variant="block" upgradeAction={props}>
    <OperationsAnalyticsSection data={opsData} />
  </FeatureGate>
</DashboardPage>
```

#### Testing Requirements

When adding plan-gated features, ensure:

1. **Component tests** (`tests/components/`):
   - Free plan sees feature locked with upgrade CTA
   - Pro plan sees business-tier features locked
   - Business plan sees all features unlocked
   - Locked states are keyboard accessible
   - ARIA attributes are correct

2. **Integration tests** (`tests/integration/`):
   - Server actions reject unauthorized plan operations
   - Error messages include upgrade guidance
   - Plan checks happen before expensive operations
   - Plan transitions (upgrade/downgrade) take effect immediately
   - Business plan bypasses all restrictions

3. **E2E tests** (`tests/e2e/`) for critical discovery flows:
   - Free user can navigate to paid feature pages
   - Locked features show upgrade prompts
   - Clicking upgrade CTA initiates checkout

#### Role vs Plan Distinction

**Role permissions** (business member permissions) are separate from **plan entitlements**:

- **Role restrictions** may hide features (e.g., non-admins can't see billing)
- **Plan restrictions** must NOT hide features (show as locked/paywalled instead)

A staff member on the free plan should see paid features as locked/paywalled, not hidden. Role permissions are enforced through `canManageBusinessAdministration()`, `canManageOperationalBusinessSettings()`, etc., not through plan checks.

#### Summary Checklist

When implementing plan-gated features:

- [ ] Use `hasFeatureAccess()` in server actions/route handlers
- [ ] Use paywall components (`LockedAction`, `FeatureGate`, `PremiumContentBlur`, `FeaturePreviewPaywall`) for UI
- [ ] Do NOT hide navigation items by plan
- [ ] Do NOT redirect routes based on plan alone
- [ ] Do NOT use inline upgrade text without proper components
- [ ] Add feature to `lib/plans/entitlements.ts` with correct plan access
- [ ] Add `planFeatureLabels` and `planFeatureDescriptions` entries
- [ ] Write component tests for visibility at each plan tier
- [ ] Write integration tests for server-side enforcement
- [ ] Verify plan transitions work immediately

### Workflow Automation

- Automations are event-driven, business-scoped rules: a trigger event fires an action automatically.
- Automations support both simple trigger → action pairs and a visual drag-and-drop workflow builder (`@xyflow/react` canvas) for composing multi-step flows.
- Core automation triggers: inquiry received, inquiry qualified, quote sent, quote viewed, quote accepted, quote rejected, quote expired, job created, job completed, invoice sent, invoice paid, follow-up due.
- Implemented executor actions (12): add-internal-note, archive-inquiry, create-follow-up, create-job-from-quote, duplicate-quote, generate-draft-quote, generate-invoice, send-email, send-notification, update-inquiry-status, update-quote-status.
- Automations start empty for new businesses. Owners opt in via workflow templates (`features/automations/automation-templates.ts`), recommended automations, or the visual builder — do not auto-create rules on onboarding.
- Business owners can enable/disable, adjust timing, and add custom automations from settings.
- The visual builder allows owners to compose workflows by dragging trigger, condition, and action nodes onto a canvas (`features/automations/components/builder/`).
- Supporting infrastructure: condition evaluator, dispatcher, scheduler, failure tracker, processor, entitlement checks.
- Automations must respect business scoping and plan entitlements (`automations` on free, `workflowBuilder` on pro+).

### Background Jobs (Inngest)

- `lib/inngest/` owns the Inngest client, event type definitions, and the send helper.
- `lib/inngest/functions/` owns background function definitions (cron-based and event-driven).
- Cron jobs: analytics benchmarks, analytics digest, analytics rollup, analytics scheduled reports, automation scheduling, quote expiration, subscription expiration.
- Event-driven jobs: automation dispatch, AI tasks, follow-up reminders, billing lifecycle.
- Webhook route: `app/api/inngest/route.ts`.
- Dev mode: `npm run dev:inngest` starts the local Inngest dev server.

### Database & Migrations

- Drizzle ORM with sequential SQL migrations in `drizzle/`. One migration history shared across all environments.
- Schema source of truth: `lib/db/schema/index.ts` (barrel exporting 25 domain schema modules).
- Schema modules: activity, admin, ai, analytics, audit, auth, automations, business-inquiry-forms, businesses, compliance, email, follow-ups, inquiries, invoices, jobs, memories, notifications, post-win-checklist, public-actions, push-subscriptions, quote-library, quotes, reply-snippets, subscriptions.
- Config: `drizzle.config.ts` uses `DATABASE_MIGRATION_URL` (direct connection, never pooler).
- App runtime uses `DATABASE_URL` (pooler for Supabase). Migrations use `DATABASE_MIGRATION_URL` (direct connection, port 5432).
- **Development workflow**: edit schema → `npm run db:generate -- --name descriptive_name` → `npm run db:migrate` → commit migration + schema together.
- **Production workflow**: `vercel-build` runs `npm run db:migrate:strict && next build`. Production only applies existing migrations. Never generate or push in production.
- **Never edit a committed migration file.** Always create a new migration.
- **Never run `db:generate` or `db:push` against production.**
- `npm run db:reset` drops and re-migrates a local database. Refuses to run against remote DBs by default.
- `scripts/mark-migrations-applied.ts` marks migrations as applied without running them.
- `scripts/migrate.ts` rejects pooler URLs (e.g. Supabase `:6543`) to prevent DDL failures; use a direct migration URL (`:5432`).
- See `docs/database-migrations.md` for the full workflow reference.

### Performance & Caching

- **Two-layer caching pattern.** High-frequency queries use `React.cache()` for within-request deduplication AND a `"use cache"` inner function for cross-request caching. Keep both layers — they serve different purposes.
- **Shell-level queries** are cached with `"use cache"` + `cacheTag` via `lib/cache/shell-tags.ts`. When adding new shell-level queries, follow the same pattern.
- **Cache tags** use the scoping helpers in `lib/cache/shell-tags.ts` (user-scoped) and `lib/cache/business-tags.ts` (business-scoped). Add `revalidateTag()` calls in mutation actions that change cached data.
- **Parallelize independent data fetches.** Use `Promise.all` for queries that do not depend on each other.
- **Stream non-blocking data via Suspense.** Layout-level data not required for the shell should be rendered inside `<Suspense>` as async server components.
- **Do not add blocking awaits in layouts** for data that only a specific page needs.
- **Dev timing.** Use `timed()` or `devTiming()` from `lib/dev/server-timing.ts` to measure server-side latency in development (no-ops in production).
- **Do not use `next/dynamic` for server components.** Reserve it for client-only interactive components.
- **Upstash Redis** is used for cross-instance concerns (rate limiting, deduplication). Do not use it as a general-purpose cache layer.

### Instant Navigation

All authenticated dashboard pages use Next.js instant navigation via the `unstable_instant` route segment config. This makes client-side navigation between sibling routes paint the destination's structural shell immediately without a server roundtrip.

**Required page structure (non-blocking structural shell):**

```tsx
// The page function MUST be synchronous — no async, no awaits above the return.
export const unstable_instant = {
  prefetch: "static",
  samples: [{ params: { businessSlug: "demo" }, headers: [["rsc", "1"], ["next-action", null]] }],
};

export default function SomePage({ params, searchParams }) {
  return (
    <DashboardPage>
      <PageHeader title="..." />
      <Suspense fallback={<Skeleton />}>
        <DataRegion params={params} />
      </Suspense>
    </DashboardPage>
  );
}

// All dynamic reads live HERE, inside a Suspense-wrapped async child.
async function DataRegion({ params }) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  // ... queries and rendering
}
```

**Key rules:**
- Every page returns its structural shell and skeleton fallbacks **synchronously**.
- `params`, `searchParams`, `getAppShellContext`, session checks, and all data queries go inside `<Suspense>`-wrapped async child server components.
- Each independently-loading region gets its own `<Suspense>` boundary.
- Independently-failing regions additionally wrap in `<RegionErrorBoundary>` (`components/shared/region-error-boundary.tsx`).
- `unstable_instant` must include `samples` with appropriate route params for build-time validation to work.
- Never re-add `unstable_disableValidation: true` — if a route cannot pass validation, use the escape-hatch registry (`lib/instant-navigation/escape-hatch-registry.ts`).
- Router stale times: `experimental.staleTimes = { dynamic: 30, static: 180 }` in `next.config.ts`.
- Source of truth for Next.js instant navigation behavior: `node_modules/next/dist/docs/` (especially `instant-navigation.md`, `instant.md`, `prefetching.md`, `staleTimes.md`).

**Governance tooling** (`lib/instant-navigation/`):
- `stale-times.ts` — bounds validator
- `escape-hatches.ts` — escape-hatch validator and overdue detection
- `escape-hatch-registry.ts` — tracked exemption entries
- `migration-coverage.ts` — coverage derivation
- `rollout.ts` — verification gate and phase ordering
- `scripts/instant-navigation/check-coverage.ts` — CI coverage check

## Testing

### Test Structure

- `tests/unit/` — validation schemas, parsing helpers, route authorization, plan access, deterministic logic
- `tests/components/` — meaningful interactive UI behavior only (intentionally small)
- `tests/integration/` — DB-backed: access control, server actions, route handlers, workflow mutations, billing webhooks, public analytics, quote status transitions
- `tests/e2e/` — Playwright: sign-in, non-member denial, public inquiry submission, quote creation/sending, public quote response

### Testing Priorities

- Test behavior and product risk, not implementation details.
- Backend permission tests are mandatory for business-scoped behavior.
- Keep integration tests DB-backed for access control, workflow mutations, and server actions.
- Avoid shallow render tests and brittle snapshots.
- Property-based testing available via `fast-check`.

### Test Commands

```bash
npm run test               # Unit + component tests (sequential)
npm run test:unit          # Unit tests only
npm run test:components    # Component tests only
npm run test:integration   # DB-backed integration tests
npm run test:e2e:smoke     # Playwright smoke tests (@smoke tag)
npm run test:e2e           # Full Playwright suite
npm run test:all           # All test tiers
npm run test:coverage      # Unit + component with v8 coverage
```

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
3. the workflow emphasis stays on inquiry → quote → share/send → follow-up → accepted/rejected → job → invoice,
4. onboarding remains guided through a few starter business paths,
5. templates and defaults are more opinionated but still editable,
6. the implementation stays lightweight, maintainable, and consistent with the current architecture and design system,
7. relevant lint, type, build, or end-to-end checks are run or explicitly called out,
8. assumptions and follow-ups are stated clearly,
9. touched files are summarized briefly.

## Verification

- Docs and instruction changes: do a read-through plus targeted grep checks.
- Most code changes: `npm run check` (runs lint + typecheck + SEO audits).
- Logic, component, or validation changes: also run `npm run test`.
- Server actions, route handlers, authz, billing, or DB-backed changes: run `npm run test:integration`.
- Route, layout, or system changes: also run `npm run build`.
- Covered user-flow changes: run the relevant `npm run test:e2e:smoke`; use `npm run test:e2e` when the change touches broader browser journeys.
- After schema changes: `npm run db:generate -- --name descriptive_name` then `npm run db:migrate` before other checks.
- If demo data or e2e fixtures need refreshing: `npm run db:migrate` and `npm run db:seed-demo`.
- Prefer `npm run dev:app` for app-only local work. `npm run dev` also starts Inngest dev server and `ngrok` for callback and webhook testing.
- Vercel owns preview and production deployment through Git integration.

### Local verification before pushing

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

### SEO Audits (`npm run check:seo`)

Runs 7 automated audits: loading coverage, image priority, metadata uniqueness, use-cache purity, image usage, use-client placement, next-dynamic comments.

## Environment Variables

Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

See `.env.example` for the full list. Key provider groups:

- **Database:** `DATABASE_URL` (pooler), `DATABASE_MIGRATION_URL` (direct)
- **Auth:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Email:** `RESEND_API_KEY`, `MAILTRAP_API_TOKEN`, `BREVO_API_KEY`, `EMAIL_DOMAIN`, `EMAIL_FROM_*`
- **AI providers:** `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `NVIDIA_NIM_API_KEY`
- **Billing:** `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`, `POLAR_*_PRODUCT_ID`
- **Push:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- **Inngest:** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- **Admin:** `ADMIN_EMAILS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Agent Discovery & MCP

The app exposes `.well-known` routes for agent interoperability:

- `/.well-known/agent-skills/` — agent skill definitions
- `/.well-known/api-catalog/` — API catalog
- `/.well-known/mcp/` — MCP server metadata
- `/.well-known/oauth-authorization-server/` — OAuth authorization server metadata
- `/.well-known/oauth-protected-resource/` — OAuth protected resource metadata
- `/.well-known/openid-configuration/` — OpenID Connect configuration
- `/.well-known/security-txt/` — Security contact information

Markdown agent discovery: requests to `/` with `Accept: text/markdown` are rewritten to `/api/public/markdown`.
