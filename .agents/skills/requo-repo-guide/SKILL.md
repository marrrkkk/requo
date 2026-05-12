---
name: requo-repo-guide
description: Requo repository-specific architecture, design system, provider boundaries, and verification workflow. Use when modifying, reviewing, or planning changes in this repository so work follows DESIGN.md, shared wrappers, onboarding-first business creation, Better Auth and Supabase boundaries, and the repo's CI checks.
---

# Requo Repo Guide

Read these sources first when relevant:

- `../../../DESIGN.md` for UI work
- `../../../docs/architecture/requo-architecture.md` for structure
- `../../../app/globals.css` for semantic tokens, surfaces, and motion utilities
- `../../../components/shared/dashboard-layout.tsx`, `../../../components/shared/form-layout.tsx`, and `../../../components/shared/page-header.tsx` for shared layout patterns
- `../../../app/onboarding/page.tsx` and `../../../lib/auth/config.ts` for current auth and onboarding behavior

## Working Defaults

- Inspect existing files before editing.
- Keep diffs small and feature-scoped.
- Keep `app/` focused on routes, layouts, loading states, and route handlers.
- Keep business logic, validation, queries, actions, and mutations in `features/`.
- Keep provider integrations and shared utilities in `lib/`.
- Stay within current product scope: owner-first service-business workflows with workspace billing and light role-based membership. Do not add marketplace, live chat, mobile app, dispatch, payroll, invoicing, or advanced team collaboration unless explicitly requested.

## UI System

- Treat `DESIGN.md` as the canonical UI system.
- Reuse shared wrappers and `components/ui/*` primitives before building custom markup.
- Prefer semantic utilities and tokens such as `surface-*`, `control-*`, `overlay-*`, `table-*`, `meta-label`, `hero-panel`, `section-panel`, and `soft-panel`.
- Preserve the calm, modern, minimalist Requo visual language.
- Do not copy legacy raw status colors or `space-y-*` stacks from older files into new work.

## Auth, Data, And Providers

- Use Better Auth only. Do not introduce Supabase Auth.
- Signup creates the user and profile. Onboarding creates the first business. Additional businesses are explicit business flows.
- Enforce business ownership through scoped queries and business-aware helpers.
- Keep private asset access server-side.
- Validate external input with Zod.
- Keep provider boundaries narrow:
  - Better Auth for sessions and password flows
  - Supabase for storage and realtime-backed notification plumbing
- Resend for transactional email
- Groq, Gemini, and OpenRouter through `lib/ai` for server-side AI drafting
- Paddle for card subscriptions (USD, merchant of record)

## Billing

- Subscriptions are account-scoped.
- `account_subscriptions` is authoritative; `businesses.plan` is a denormalized read cache.
- `lib/billing/subscription-service.ts` is the single write path for subscription mutations.
- `lib/billing/webhook-processor.ts` records provider events in `billing_events` for idempotency.
- `lib/billing/refunds.ts` is the single path for Paddle refund requests.
- Paddle webhook route: `app/api/billing/paddle/webhook/route.ts`.
- Refund request route: `app/api/billing/refund/route.ts`.

## Testing

- Test behavior and product risk, not implementation details.
- Backend permission tests are required for business/workspace access changes.
- Prefer DB-backed integration tests for server actions, route handlers, workflow mutations, billing webhooks, and authorization-sensitive behavior.
- Keep component tests for meaningful interaction only. Avoid shallow render checks and snapshots.

## Verification

- Docs-only changes: read through the edited files and run targeted grep checks.
- Most code changes: run `npm run check`.
- Logic, validation, or component changes: also run `npm run test`.
- Server action, route handler, billing, authz, or DB-backed changes: also run `npm run test:integration`.
- Route, layout, or system wiring changes: also run `npm run build`.
- Covered user-flow changes: run the relevant `npm run test:e2e:smoke`; use `npm run test:e2e` for broader browser journeys.
- CI baseline is lint, typecheck, unit/component tests, build, DB-backed integration tests, and Playwright smoke coverage.
