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

Requo is an owner-first SaaS app for service businesses. It handles public inquiry intake, business-scoped dashboards, quotes, knowledge files, AI-assisted drafts, and transactional email.

### Core Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS v4 and shadcn/ui
- Drizzle ORM with PostgreSQL
- Better Auth for authentication and sessions
- Supabase for storage and realtime-backed plumbing
- Resend for transactional email
- OpenRouter for AI features

## Working Defaults

1. Inspect relevant existing files first.
2. Plan before coding when the work is multi-step or architectural.
3. Prefer small, reviewable diffs over rewrites.
4. Keep `app/` thin and move product logic into `features/` or `lib/`.
5. Reuse existing utilities, shared wrappers, and semantic tokens before creating new patterns.
6. Do not invent fake implementations if a real one can be built.
7. Mention assumptions clearly and summarize changed files plus follow-ups.
8. Run the relevant checks after code changes.

## Product Constraints

Do not add:

- billing or subscriptions
- marketplace features
- mobile app flows
- live chat
- advanced team collaboration beyond owner-first flows
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

## UI Rules

- Follow `DESIGN.md`. Do not invent a new visual language.
- Reuse shared wrappers such as `DashboardPage`, `PageHeader`, `DashboardSection`, `DashboardTableContainer`, `FormSection`, `FormActions`, `FieldGroup`, `Field`, `Button`, `Card`, `Empty`, `Alert`, `Badge`, `Sheet`, and `Dialog` before custom markup.
- Prefer semantic tokens and utilities such as `surface-*`, `control-*`, `overlay-*`, `table-*`, `meta-label`, `hero-panel`, `section-panel`, and `soft-panel`.
- Keep the UI calm, modern, minimalist, polished, and practical.
- Avoid raw palette utilities, noisy decoration, random gradients, flashy animation, and page-by-page primitive restyling.
- Legacy raw status colors and `space-y-*` stacks still exist in older files. Treat them as cleanup debt, not patterns for new work.

## Done Means

A task is done when:

1. the requested slice is implemented,
2. the change matches the current architecture and design system,
3. relevant lint, type, build, or end-to-end checks are run or explicitly called out,
4. assumptions and follow-ups are stated clearly,
5. touched files are summarized briefly.

## Verification

- Docs and instruction changes: do a read-through plus targeted grep checks.
- Most code changes: `npm run lint` and `npm run typecheck`.
- Route, layout, or system changes: also run `npm run build`.
- Covered user-flow changes: run the relevant `npm run test:e2e`.
- CI currently runs lint, typecheck, build, and Playwright on push and pull request.
