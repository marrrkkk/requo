<p align="center">
  <img src="./public/logo.svg" alt="Requo logo" width="72" />
</p>

<h1 align="center">Requo</h1>

<p align="center"><strong>Inquiry-to-quote software for owner-led service businesses.</strong></p>

<p align="center">Capture requests, build clear quotes, share them professionally, and follow up consistently.</p>

## What Requo Does

Requo supports the workflow from a new customer request to a quote response:

- Public inquiry pages and configurable inquiry forms, plus manual inquiry entry
- Business-scoped inboxes with qualification, duplicate detection, notes, attachments, and status tracking
- Quote editor with reusable Products, line items, revisions, public quote pages, and response tracking
- Quote delivery by public link or Requo email, with configurable email templates
- Manual and automatic follow-ups with reminders and AI-assisted message drafting
- Conversion and workflow analytics, CSV exports, notifications, audit logs, and business members
- AI-assisted quote drafting grounded in business knowledge files and the Products library
- Business onboarding templates, multi-business accounts, and Polar subscriptions with Free, Pro, and Business plans

Requo is intentionally focused on owner-led service workflows. It does not currently include jobs, invoices, calendar scheduling, a mobile app, marketplace features, or a general-purpose AI chat product.

## Stack

- Next.js 16.2 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Radix UI
- PostgreSQL with Drizzle ORM
- Better Auth for authentication
- Supabase for storage and realtime notification plumbing
- Resend with Mailtrap/Brevo fallbacks for transactional email
- Vercel AI SDK with Groq, Cerebras, Gemini, Mistral, Cloudflare Workers AI, NVIDIA NIM, and OpenRouter routing
- Inngest for background jobs
- Polar for subscriptions and checkout

## Quick Start

Prerequisites: Node.js 22+, npm, PostgreSQL, and environment values from `.env.example`.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev:app
```

`npm run db:seed` resets application data and creates deterministic local accounts and businesses. It is for development only. The seed prints the account emails and password at completion; do not use these credentials outside a local environment.

Run `npm run dev` when you also need the local Inngest server and an ngrok tunnel for webhook testing.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `npm run dev:app` | Start the Next.js development server |
| `npm run dev:inngest` | Start the local Inngest Dev Server |
| `npm run check` | Lint, typecheck, and repository audits |
| `npm run test` | Unit and component tests |
| `npm run test:integration` | Postgres-backed integration tests |
| `npm run test:e2e:smoke` | Playwright smoke journeys |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Reset and seed local demo data |
| `npm run db:studio` | Open Drizzle Studio |

## Project Layout

```text
app/           Routes, layouts, pages, and API handlers
components/    Shared UI, shell, and marketing components
features/      Product logic, queries, actions, and feature UI
lib/           Auth, database, providers, caching, and utilities
scripts/       Migrations, seeders, audits, and operational tools
tests/         Unit, component, integration, and end-to-end tests
docs/          Setup, architecture, billing, and support documentation
```

## Documentation

- [Local setup](./docs/setup/local.md)
- [Deployment](./docs/setup/deployment.md)
- [Billing](./docs/setup/billing.md)
- [Architecture](./docs/architecture/requo-architecture.md)
- [Design system](./DESIGN.md)
- [Testing](./tests/README.md)
- [Agent guide](./AGENTS.md)

## Verification

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```
