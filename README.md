<p align="center">
  <img src="./public/logo.svg" alt="Requo logo" width="72" />
</p>

<h1 align="center">Requo</h1>

<p align="center">
  Owner-first quoting software for service businesses.
</p>

<p align="center">
  Requo helps service businesses capture customer inquiries, organize work in one dashboard,
  build clear quotes, and draft faster replies with their own business knowledge.
</p>

<p align="center">
  <img src="./docs/images/requo-homepage.png" alt="Requo marketing homepage" width="1200" />
</p>

## Overview

Requo is a modern SaaS web app for owner-operated service businesses that need a calmer
workflow between first inquiry and finished quote.

The product is built around a simple operating model:

- collect structured inquiries from a public form
- keep customer context, files, notes, and pricing in one place
- draft and send quotes without losing the thread
- use AI to prepare practical reply drafts from business knowledge
- stay inside an owner-first dashboard instead of juggling inboxes and spreadsheets

## Product Areas

- Public inquiry intake with file uploads, budget, timing, and service details
- Protected owner dashboard for inquiries, quotes, follow-up, and business settings
- Quote workflow with draft, sent, accepted, rejected, expired, and follow-up states
- Knowledge and FAQ management for business-specific reference material
- AI-assisted response drafting through OpenRouter
- Transactional email flows through Resend
- Business branding, public inquiry page settings, and logo support
- Analytics and notification foundations for operational visibility

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Better Auth for authentication and sessions
- Drizzle ORM with PostgreSQL
- Supabase for storage and realtime-backed notification plumbing
- Resend for transactional email
- OpenRouter for AI features

## Getting Started

### Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL
- A `.env` file based on `.env.example`

### Local Setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create a local env file.

   macOS or Linux:

   ```bash
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Run database migrations.

   ```bash
   npm run db:migrate
   ```

4. Seed demo data.

   ```bash
   npm run db:seed-demo
   ```

5. Start the app.

   ```bash
   npm run dev
   ```

6. Open the app at the same origin configured in `BETTER_AUTH_URL`.

### Demo Seed Defaults

- Owner name: `Morgan Lee`
- Owner email: `demo@requo.local`
- Owner password: `ChangeMe123456!`
- Business name: `BrightSide Print Studio`
- Business slug: `brightside-print-studio`

The demo seed also creates two additional sample businesses, three inquiry forms per business, and several hundred seeded inquiries and quotes for dashboard browsing.

## Environment Variables

### Core runtime

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

### Database tooling

- `DATABASE_MIGRATION_URL`

### Optional providers

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`

### Optional app config

- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `VERCEL_URL`
- `DEMO_OWNER_NAME`
- `DEMO_OWNER_EMAIL`
- `DEMO_OWNER_PASSWORD`
- `DEMO_BUSINESS_NAME`
- `DEMO_BUSINESS_SLUG`
- `DEMO_QUOTE_PUBLIC_TOKEN`
- `DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN`

For full setup expectations, read:

- [Local setup](./docs/setup/local.md)
- [Deployment setup](./docs/setup/deployment.md)

For Supabase-backed setups:

- use `DATABASE_URL` with the pooler host on port `6543` for app/runtime traffic
- use `DATABASE_MIGRATION_URL` with the same pooler host on port `5432` for Drizzle migrations

Example:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-<region>.pooler.supabase.com:6543/postgres
DATABASE_MIGRATION_URL=postgresql://postgres.<project-ref>:<db-password>@aws-<region>.pooler.supabase.com:5432/postgres
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the production app |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run check` | Run lint and typecheck together |
| `npm run test:e2e` | Run the Playwright end-to-end suite |
| `npm run db:generate` | Generate Drizzle artifacts |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:push` | Push schema changes directly |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed-demo` | Seed the demo workspace |

## Repository Map

- `app/` route groups, layouts, pages, and route handlers
- `components/` shared UI primitives, shell UI, and marketing components
- `features/` product slices such as account, auth, businesses, inquiries, quotes, knowledge, AI, analytics, notifications, onboarding, settings, and theme
- `lib/` auth, database, provider clients, env validation, and shared utilities
- `emails/templates/` transactional email rendering
- `docs/` setup and architecture documentation
- `tests/e2e/` Playwright coverage

## Architecture Notes

- Better Auth is the only authentication system in this app
- Initial signup creates the user and profile; onboarding creates the first business and later business creation stays explicit in business flows
- Business ownership is enforced through business-aware server helpers and scoped queries
- Supabase is used for storage and notification plumbing, not Supabase Auth
- `DESIGN.md` is the canonical UI system, with semantic tokens and shared wrappers implemented in `app/globals.css` and `components/shared/*`
- Private assets stay behind authenticated route handlers
- AI drafting stays server-side and uses business context plus uploaded knowledge

Detailed architecture guidance lives in [docs/architecture/requo-architecture.md](./docs/architecture/requo-architecture.md).

## Verification

The baseline health checks for this repository are:

```bash
npm run check
npm run build
npm run test:e2e
```

## Documentation

- [Agent guide](./AGENTS.md)
- [Design system](./DESIGN.md)
- [Local setup](./docs/setup/local.md)
- [Deployment setup](./docs/setup/deployment.md)
- [Architecture](./docs/architecture/requo-architecture.md)

## Status

This repository already contains a working product foundation for:

- authentication and password flows
- profile creation, onboarding, and owner dashboard flows
- public inquiry intake
- quote drafting and public quote response
- business knowledge management
- AI reply drafting
- notification and analytics groundwork

Requo is intentionally scoped for service businesses and owner-first workflows. It does not
try to cover billing, marketplace behavior, advanced team collaboration, or mobile app concerns.
