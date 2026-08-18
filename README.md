<p align="center">
  <img src="./public/logo.svg" alt="Requo logo" width="72" />
</p>

<h1 align="center">Requo</h1>

<p align="center">
  <strong>Inquiry-to-quote software for owner-led service businesses.</strong>
</p>

<p align="center">
  Capture requests, send clear quotes, follow up on time, and keep accepted work moving.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#development">Development</a> &bull;
  <a href="#documentation">Documentation</a>
</p>

---

## Features

Requo keeps the customer-request workflow in one place:

- **Inquiry Capture** - Public inquiry forms, custom fields, file uploads, and manual entry for calls, referrals, and direct messages
- **Quote Management** - Draft, customize, send, and share professional quotes with public response pages
- **Response Tracking** - Track viewed, accepted, rejected, expired, and voided quote states
- **Follow-ups** - Schedule reminders and keep quiet opportunities from being forgotten
- **Workflow Automation** - Connect inquiry, quote, follow-up, and response events with automation rules
- **Business Workspaces** - Keep data scoped to each business, with role-aware team access and billing
- **AI-Assisted Drafting** - Use business context and pricing knowledge to speed up quote and follow-up writing
- **Analytics** - Understand conversion, response time, and pipeline movement

## Tech Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui, Radix UI
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Better Auth
- **Storage and Realtime:** Supabase
- **Email:** Resend with Mailtrap and Brevo fallbacks
- **AI:** Vercel AI SDK with Groq, Cerebras, Gemini, Mistral, and OpenRouter providers
- **Background Jobs:** Inngest
- **Billing:** Polar

## Getting Started

### Prerequisites

- Node.js 22 or newer
- PostgreSQL database
- Service credentials configured in `.env.local` (see `.env.example`)

### Quick Start

```bash
npm install
npm run db:migrate
npm run db:seed-demo
npm run dev:app
```

Use `npm run dev` when you also need the local Inngest server and ngrok for webhook testing.

### Demo Credentials

After seeding demo data:

- **Email:** `demo@requo.local`
- **Password:** `ChangeMe123456!`

## Development

### Common Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:app` | Start the Next.js app |
| `npm run dev:inngest` | Start the local Inngest server |
| `npm run build` | Create a production build |
| `npm run check` | Run lint, typecheck, and repository audits |
| `npm run test` | Run unit and component tests |
| `npm run test:integration` | Run database-backed integration tests |
| `npm run test:e2e:smoke` | Run Playwright smoke tests |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed-demo` | Seed local demo data |

### Project Structure

```text
app/           Routes, layouts, pages, and API handlers
components/    Shared UI, shell, and marketing components
features/      Product logic, queries, actions, and feature UI
lib/           Auth, database, providers, caching, and utilities
scripts/       Migrations, seeders, audits, and operational tools
tests/         Unit, component, integration, and end-to-end tests
```

### Verification

For a full local verification pass:

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

## Documentation

- [Agent Guide](./AGENTS.md) - Working conventions and architecture
- [Design System](./DESIGN.md) - UI tokens and component patterns
- [Local Setup](./docs/setup/local.md) - Detailed environment setup
- [Deployment](./docs/setup/deployment.md) - Production deployment guide
- [Architecture](./docs/architecture/requo-architecture.md) - System architecture

---

<p align="center">
  Built for owner-led service businesses that handle inbound inquiries and custom quotes.
</p>
