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
- Resend for transactional email
- OpenRouter for AI features
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
- `APP_ENCRYPTION_KEYS`
- `APP_TOKEN_HASH_SECRET`

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
| `npm run db:backfill-security-secrets` | Backfill encrypted reversible secrets after configuring app crypto keys |
| `npm run db:push` | Push schema changes directly |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed-demo` | Seed the demo workspace |

## Testing And CI

Requo uses a layered test strategy:

- `tests/unit/` covers logic-heavy utilities, pricing, plan access, helpers, and parsing behavior
- `tests/components/` covers high-value interactive UI with Vitest, jsdom, and React Testing Library
- `tests/integration/` covers DB-backed actions, webhook handlers, and authorization-sensitive server behavior
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
- `features/` product slices such as account, auth, businesses, inquiries, quotes, knowledge, AI, analytics, notifications, onboarding, settings, and theme
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
- Subscriptions are workspace-scoped with PayMongo for QRPh and Paddle for cards
- The `workspaces.plan` column is a denormalized read cache; the authoritative state lives in `workspace_subscriptions`
- Billing mutations go through `lib/billing/subscription-service.ts`; webhooks go through `lib/billing/webhook-processor.ts`
- Reversible stored credentials and provider tokens use app-layer encryption via `APP_ENCRYPTION_KEYS`; opaque lookup tokens are hashed
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
- [Architecture](./docs/architecture/requo-architecture.md)

Requo is intentionally scoped for owner-led service businesses that handle inbound
inquiries and custom quotes. It does not try to become an enterprise CRM, field-service
dispatch tool, scheduling suite, payroll tool, invoicing platform, marketplace, or
mobile-first collaboration app.
