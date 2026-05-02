<p align="center">
  <img src="./public/logo.svg" alt="Requo logo" width="72" />
</p>

<h1 align="center">Requo</h1>

<p align="center">
  Inquiry-to-quote software for owner-led service businesses.
</p>

<p align="center">
  Requo helps service businesses capture inquiries, turn qualified work into quotes,
  share or send those quotes, follow up, and track viewed, accepted, rejected,
  expired, and voided states from one place.
</p>

<p align="center">
  <img src="./docs/images/requo-homepage.png" alt="Requo marketing homepage" width="1200" />
</p>

## Overview

Requo is a multi-business SaaS app for owner-led service businesses that manage inbound
inquiries and custom quotes.

It is built around one shared workflow:

- capture inquiries from public forms, referrals, ads, socials, and directories
- turn qualified inquiries into clear, professional quotes
- share quote links or send quote emails from Requo
- follow up consistently without losing context
- track public quote views and customer accept/reject responses

The product supports multiple business types through guided starter templates, while
keeping the core experience focused on this workflow rather than generic configurability.

## Product Areas

- Public inquiry intake with editable forms, supporting cards, optional showcase images, and file uploads
- Guided onboarding with 4 starter templates:
  `Agency / Studio`, `Consultant / Professional Services`, `Contractor / Home Service`, and `General Service Business`
- Owner dashboard for inquiries, lead qualification, quotes, follow-ups, analytics, and business settings
- Quote workflow with draft, sent, viewed, accepted, rejected, expired, voided, and post-acceptance states
- Public quote pages with customer accept/reject responses and response messages
- Manual quote sharing plus Requo email sending through transactional email
- Follow-up scheduling and lifecycle tracking for inquiries and quotes
- Starter defaults for inquiry fields, reply snippets, and quote notes that stay editable later
- Knowledge and FAQ management for business-specific reference material
- AI-assisted response drafting through Groq, Gemini, and OpenRouter fallback routing
- Transactional email flows through Resend, with Mailtrap and Brevo fallback
- Subscription billing with PayMongo (QRPh for Philippines) and Paddle (cards for international)
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
- Resend, Mailtrap, and Brevo for transactional email fallback
- Groq, Gemini, and OpenRouter for AI-assisted drafting
- PayMongo for QRPh payments (Philippines)
- Paddle for card/global payments

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
   npm run dev:app
   ```

   Use `npm run dev` only when you also need an `ngrok` tunnel for public callbacks,
   webhook testing, or external provider flows.

6. Open the app at the same origin configured in `BETTER_AUTH_URL`.

### Demo Seed Defaults

- Owner name: `Morgan Lee`
- Owner email: `demo@requo.local`
- Owner password: `ChangeMe123456!`
- Business name: `BrightSide Print Studio`
- Business slug: `brightside-print-studio`
- Additional seeded users:
  `manager@requo.local`, `staff@requo.local`, and `outsider@requo.local`

The demo seed also creates two additional sample businesses, three inquiry forms per business, and several hundred seeded inquiries and quotes for dashboard browsing.

## Environment Variables

### Core runtime

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `APP_TOKEN_HASH_SECRET`
- `ADMIN_EMAILS`

### Database tooling

- `DATABASE_MIGRATION_URL`

### Optional providers

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `RESEND_API_KEY`
- `MAILTRAP_API_TOKEN`
- `BREVO_API_KEY`
- `EMAIL_DOMAIN`
- `EMAIL_FROM_DEFAULT`
- `EMAIL_FROM_NOTIFICATIONS`
- `EMAIL_FROM_SYSTEM`
- `EMAIL_FROM_QUOTES`
- `EMAIL_FROM_SUPPORT`
- `RESEND_FROM_EMAIL` (legacy fallback)
- `RESEND_REPLY_TO_EMAIL`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

### Optional app config

- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `VERCEL_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `DEMO_OWNER_NAME`
- `DEMO_OWNER_EMAIL`
- `DEMO_OWNER_PASSWORD`
- `DEMO_BUSINESS_NAME`
- `DEMO_BUSINESS_SLUG`
- `DEMO_QUOTE_PUBLIC_TOKEN`
- `DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN`
- `DEMO_VOIDED_QUOTE_PUBLIC_TOKEN`

### Billing providers

- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_PUBLIC_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_PRO_PRICE_ID`
- `PADDLE_PRO_YEARLY_PRICE_ID`
- `PADDLE_BUSINESS_PRICE_ID`
- `PADDLE_BUSINESS_YEARLY_PRICE_ID`
- `PADDLE_ENVIRONMENT`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `NEXT_PUBLIC_PADDLE_ENVIRONMENT`

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
| `npm run dev` | Start the local development server and an `ngrok` tunnel |
| `npm run dev:app` | Start only the local Next.js development server |
| `npm run build` | Build the production app |
| `npm run start` | Run the production build locally |
| `npm run start:app` | Run the production build locally with the app-only entrypoint |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run check` | Run lint and typecheck together |
| `npm run test` | Run unit and component tests |
| `npm run test:unit` | Run unit tests with Vitest |
| `npm run test:components` | Run component tests with Vitest and React Testing Library |
| `npm run test:integration` | Run DB-backed integration tests with Vitest after migrations |
| `npm run test:e2e:smoke` | Run the Playwright smoke suite used in CI |
| `npm run test:e2e` | Run the full Playwright suite |
| `npm run test:e2e:full` | Run the full Playwright suite explicitly |
| `npm run test:all` | Run all tests (unit + integration + e2e) |
| `npm run test:coverage` | Run unit and component tests with coverage report |
| `npm run db:generate` | Generate Drizzle artifacts |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:push` | Push schema changes directly |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed-demo` | Seed the demo workspace |

## Testing And CI

Requo uses a layered, risk-based test strategy:

- `tests/unit/` covers validation schemas, parsing, plan access, pricing, auth helpers, and critical route authorization
- `tests/components/` covers meaningful interactive UI behavior with Vitest, jsdom, and React Testing Library
- `tests/integration/` covers DB-backed access control, inquiry submission, quote mutation/status transitions, public analytics, follow-ups, billing routes, and server behavior
- `tests/e2e/` covers product-critical browser journeys with Playwright

The browser suite is intentionally split:

- `npm run test:e2e:smoke` is the fast CI slice for critical sign-in, authorization, public inquiry, and public quote flows
- `npm run test:e2e` runs the fuller browser suite for broader regression coverage

Deployment and CI responsibilities are intentionally split:

- Vercel handles preview and production deployments
- GitHub Actions handles merge gates:
  - `verify`: install, lint, typecheck, unit/component tests, and build
  - `server-tests`: Postgres-backed integration tests plus the Playwright smoke suite

## Repository Map

- `app/` route groups, layouts, pages, and route handlers
- `components/` shared UI primitives, shell UI, and marketing components
- `features/` product slices such as account, AI, analytics, audit, auth, billing, businesses, business members, calendar, customers, follow-ups, inquiries, memory/knowledge, notifications, onboarding, quotes, settings, theme, workspace members, and workspaces
- `lib/` auth, database, provider clients, env validation, and shared utilities
- `emails/templates/` transactional email rendering
- `docs/` setup and architecture documentation
- `tests/unit/` Vitest unit tests for utilities and logic
- `tests/components/` Vitest component tests for React components
- `tests/integration/` Vitest integration tests for database-backed actions, route handlers, and authorization boundaries
- `tests/e2e/` Playwright end-to-end tests

### Billing

- `lib/billing/` billing domain types, plan pricing, region detection, subscription service, webhook processing, and provider clients (PayMongo, Paddle)
- `lib/billing/providers/` PayMongo and Paddle REST clients with webhook signature verification
- `lib/db/schema/subscriptions.ts` workspace_subscriptions, billing_events, and payment_attempts tables
- `features/billing/` checkout dialog, billing status card, upgrade button, server actions, and queries
- `app/api/billing/` webhook route handlers for PayMongo and Paddle
- `features/follow-ups/` follow-up creation, rescheduling, completion, skipping, and reminders
- `features/analytics/` conversion/workflow analytics plus public inquiry and quote view tracking
- `features/workspace-members/` and `features/business-members/` workspace and business role management

## Architecture Notes

- Better Auth is the only authentication system in this app
- Initial signup creates the user and profile; onboarding creates the first business and later business creation stays explicit in business flows
- Business ownership is enforced through business-aware server helpers and scoped queries
- Supabase is used for storage and notification plumbing, not Supabase Auth
- `DESIGN.md` is the canonical UI system, with semantic tokens and shared wrappers implemented in `app/globals.css` and `components/shared/*`
- Private assets stay behind authenticated route handlers
- AI drafting stays server-side and uses business context plus uploaded knowledge, with provider fallback ordered Groq -> Gemini -> OpenRouter
- Marketing, onboarding, starter templates, and in-app copy are aligned around the inquiry -> quote -> share/send -> follow-up -> viewed/accepted/rejected workflow
- Starter templates are opinionated defaults, not rigid vertical product modes
- Subscriptions are workspace-scoped with PayMongo for QRPh and Paddle for cards
- The `workspaces.plan` column is a denormalized read cache; the authoritative state lives in `workspace_subscriptions`
- Billing mutations go through `lib/billing/subscription-service.ts`; webhooks go through `lib/billing/webhook-processor.ts`
- Opaque lookup tokens are hashed with `APP_TOKEN_HASH_SECRET` or `BETTER_AUTH_SECRET`
- See [docs/setup/billing.md](./docs/setup/billing.md) for provider setup instructions

Detailed architecture guidance lives in [docs/architecture/requo-architecture.md](./docs/architecture/requo-architecture.md).

## Verification

The baseline health checks for this repository are:

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

For broader browser coverage before larger merges, also run:

```bash
npm run test:e2e
```

## Documentation

- [Agent guide](./AGENTS.md)
- [Design system](./DESIGN.md)
- [Local setup](./docs/setup/local.md)
- [Deployment setup](./docs/setup/deployment.md)
- [Billing setup](./docs/setup/billing.md)
- [Architecture](./docs/architecture/requo-architecture.md)

Requo is intentionally scoped for owner-led service businesses that handle inbound
inquiries and custom quotes. It does not try to become an enterprise CRM, field-service
dispatch tool, scheduling suite, payroll tool, invoicing platform, marketplace, or
mobile-first collaboration app.
