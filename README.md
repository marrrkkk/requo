<p align="center">
  <img src="./public/logo.svg" alt="Requo logo" width="72" />
</p>

<h1 align="center">Requo</h1>

<p align="center">
  <strong>Inquiry-to-quote software for owner-led service businesses.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#development">Development</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Features

Requo helps service businesses manage the complete workflow from inquiry to invoice:

- **Inquiry Capture** — Public forms with file uploads, custom fields, and showcase images
- **Quote Management** — Draft, send, track, and manage quotes with accept/reject flows
- **Job Tracking** — Convert accepted quotes into tracked jobs
- **Invoicing** — Generate PDF invoices and track payment status
- **Follow-ups** — Automated scheduling and reminders
- **Workflow Automation** — Event-driven triggers and visual workflow builder
- **Multi-business Support** — Manage multiple businesses from one account
- **AI Assistance** — Smart drafting powered by multiple AI providers

## Tech Stack

- **Framework:** Next.js 16 App Router + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Better Auth
- **Storage:** Supabase
- **Email:** Resend (with Mailtrap and Brevo fallback)
- **AI:** Groq, Gemini, Mistral, Cerebras, OpenRouter
- **Billing:** Polar (merchant of record)

## Getting Started

### Prerequisites

- Node.js 22 or newer
- PostgreSQL database
- API keys for external services (see `.env.example`)

### Quick Start

```bash
# Install dependencies
npm install

# Copy environment file and configure
# (see .env.example for all required variables)

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed-demo

# Start the app
npm run dev:app
```

> **Note:** Use `npm run dev` instead of `npm run dev:app` if you need ngrok for webhook testing.

### Demo Credentials

After seeding, you can sign in with:

- **Email:** `demo@requo.local`
- **Password:** `ChangeMe123456!`

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:app` | Start Next.js dev server |
| `npm run build` | Build production app |
| `npm run check` | Run lint + typecheck |
| `npm run test` | Run unit and component tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e:smoke` | Run Playwright smoke tests |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed-demo` | Seed demo data |

### Project Structure

```
app/           # Routes, layouts, pages, and API handlers
components/    # Shared UI primitives and shell components
features/      # Product logic, queries, actions, and feature UI
lib/           # Auth, database, providers, and utilities
scripts/       # Migrations, seeders, and operational scripts
tests/         # Unit, component, integration, and e2e tests
```

### Verification

Before pushing changes, run the baseline checks:

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

## Documentation

- [Agent Guide](./AGENTS.md) — Working conventions and architecture
- [Design System](./DESIGN.md) — UI tokens and component patterns
- [Local Setup](./docs/setup/local.md) — Detailed environment setup
- [Deployment](./docs/setup/deployment.md) — Production deployment guide
- [Architecture](./docs/architecture/requo-architecture.md) — System architecture

---

<p align="center">
  Built for owner-led service businesses that handle inbound inquiries and custom quotes.
</p>
