<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Requo Development Guide

Owner-led SaaS for service businesses: inquiry → quote → share/send → follow-up → accepted/rejected → invoice (manual payments + online payments through the business's own PayMongo/Stripe/PayPal accounts — Stripe Connect platform links or BYO keys, ADR-012 / ADR-013). `app/` thin routes; product logic in `features/`; infra in `lib/`. Better Auth only; tenant isolation by `businessId`; all AI through `lib/ai/`.

## Project knowledge

Before non-trivial work, read the relevant doc:

- `DESIGN.md` — UI/UX and visual design
- `docs/architecture.md` — system architecture
- `docs/domain.md` — business concepts
- `docs/ai.md` — AI-related work
- `docs/data.md` — database/data access
- `docs/authentication.md` — auth/authz
- `docs/workflows.md` — cross-feature behavior
- `docs/integrations.md` — external services
- `docs/frontend.md` — frontend architecture
- `docs/development.md` — dev commands
- `docs/technical-debt.md` — known inconsistencies (read before "fixing" them)

Deep dives: `docs/architecture/assistant-and-agent.md`, `docs/architecture/instant-navigation.md`, `docs/architecture/adr-*.md`.

## General rules

- Treat the codebase as the source of truth; follow existing patterns before introducing new ones.
- Reuse existing abstractions, shared wrappers (`DashboardPage`, `PageHeader`, `FormSection`), and `components/ui/*` primitives.
- Preserve authorization and business/tenant boundaries (`getBusinessActionContext` + `businessId`-scoped queries).
- Never hide navigation by plan (role only); gate paid features with `features/paywall/` + server-side `hasFeatureAccess` checks.
- Do not invent APIs, fields, env vars, or services. Keep changes scoped to the requested task.
- Update tests when behavior changes; update docs when architecture or behavior changes materially.

## UI

For UI work, read `DESIGN.md` first. Reuse tokens and shared patterns. Do not invent new visual patterns when an existing Requo pattern applies.

## Verification

Before completing a non-trivial task:

1. Check the relevant doc above.
2. Verify the implementation.
3. Run: `npm run check` → `npm run test` → `npm run test:integration` (DB-backed) → `npm run build` → `npm run test:e2e:smoke` (as applicable).
4. Update documentation if architecture or behavior changed.
