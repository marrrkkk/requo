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
- Stay within current product scope: owner-first workflows only, with no billing, marketplace, live chat, mobile app, or advanced team collaboration unless explicitly requested.

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
  - OpenRouter for server-side AI drafting

## Verification

- Docs-only changes: read through the edited files and run targeted grep checks.
- Most code changes: run `npm run lint` and `npm run typecheck`.
- Route, layout, or system wiring changes: also run `npm run build`.
- Covered user-flow changes: run the relevant `npm run test:e2e`.
- CI baseline is lint, typecheck, build, and Playwright.
