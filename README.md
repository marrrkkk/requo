<p align="center">
  <img src="./public/logo.svg" alt="Requo logo" width="72" />
</p>

<h1 align="center">Requo</h1>

<p align="center">
  Inquiry-to-quote software for owner-led service businesses.
</p>

<p align="center">
  Requo helps service businesses capture inquiries, qualify leads, send quotes, and
  follow up from one place.
</p>

<p align="center">
  <img src="./docs/images/requo-homepage.png" alt="Requo marketing homepage" width="1200" />
</p>

## Overview

Requo is a multi-business SaaS app for owner-led service businesses that manage inbound
inquiries and custom quotes.

It is built around one shared workflow:

- capture inquiries from public forms, referrals, ads, socials, and directories
- qualify leads before pricing
- send clear, professional quotes faster
- follow up consistently without losing context

The product supports multiple business types through guided starter templates, while
keeping the core experience focused on this workflow rather than generic configurability.

## Product Areas

- Public inquiry intake with editable forms, supporting cards, optional showcase images, and file uploads
- Guided onboarding with 4 starter templates:
  `Agency / Studio`, `Consultant / Professional Services`, `Contractor / Home Service`, and `General Service Business`
- Owner dashboard for inquiries, lead qualification, quotes, follow-up, and business settings
- Quote workflow with draft, sent, accepted, rejected, expired, and follow-up states
- Starter defaults for inquiry fields, reply snippets, and quote notes that stay editable later
- Knowledge and FAQ management for business-specific reference material
- AI-assisted response drafting through OpenRouter
- Transactional email flows through Resend
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
- Marketing, onboarding, starter templates, and in-app copy are aligned around the inquiry -> qualification -> quote -> follow-up workflow
- Starter templates are opinionated defaults, not rigid vertical product modes

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
- workflow-led public inquiry intake
- quote drafting and public quote response
- business knowledge management
- AI reply drafting
- notification and analytics groundwork

Requo is intentionally scoped for owner-led service businesses that handle inbound
inquiries and custom quotes. It does not try to become an enterprise CRM, field-service
dispatch tool, scheduling suite, payroll tool, invoicing platform, marketplace, or
mobile-first collaboration app.
