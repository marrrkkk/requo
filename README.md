# Relay

Turn messy customer inquiries into organized quotes and bookings.

Relay is an owner-first SaaS app for small service businesses such as print shops, repair shops, tutors, event suppliers, and small agencies. This repository already contains a working product foundation with authentication, a public inquiry page, dashboard flows, quotes, knowledge, AI drafting, analytics, and settings.

## Current Status

- Next.js App Router, TypeScript, Tailwind CSS v4, and shadcn/ui are already wired.
- Better Auth, Drizzle, Supabase storage helpers, Resend, and OpenRouter integrations already exist.
- The repository currently passes `npm run check`, `npm run build`, and `npm run test:e2e`.

## Documentation

- [Local setup](docs/setup/local.md)
- [Deployment setup](docs/setup/deployment.md)
- [Architecture](docs/architecture/relay-architecture.md)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

macOS / Linux:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Run migrations

```bash
npm run db:migrate
```

Drizzle migrations are the source of truth for this repo. They include the Relay schema, Better Auth tables, timestamp triggers, RLS helpers, and storage bucket setup SQL.

### 4. Seed demo data

```bash
npm run db:seed-demo
```

Default demo credentials:

- Email: `demo@relay.local`
- Password: `ChangeMe123456!`

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

### Core required values

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Feature-gated optional values

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`

### Other optional values

- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `VERCEL_URL`
- `DEMO_OWNER_NAME`
- `DEMO_OWNER_EMAIL`
- `DEMO_OWNER_PASSWORD`
- `DEMO_BUSINESS_NAME`
- `DEMO_BUSINESS_SLUG`
- `DEMO_QUOTE_PUBLIC_TOKEN`
- `DEMO_EXPIRED_QUOTE_PUBLIC_TOKEN`

Read [docs/setup/local.md](docs/setup/local.md) for local expectations and [docs/setup/deployment.md](docs/setup/deployment.md) for production wiring.

## Architecture Snapshot

- `app/` holds route groups for marketing, auth, dashboard, public routes, and API handlers.
- `features/` holds product slices such as auth, inquiries, quotes, knowledge, AI, analytics, settings, and business overview.
- `components/ui/` contains reusable shadcn-based primitives.
- `components/shell/` and `components/shared/` hold shared app chrome and brand-level UI.
- `lib/` contains cross-cutting helpers for auth, database access, Supabase, Resend, OpenRouter, env validation, and file utilities.
- `emails/templates/` holds transactional email rendering.

The detailed target structure and reuse guidance live in [docs/architecture/relay-architecture.md](docs/architecture/relay-architecture.md).

## Integration Notes

### Better Auth

- Email/password auth, signup, login, logout, forgot password, and reset password are already wired.
- Business bootstrap runs automatically after user creation.
- Trusted origins are built from `BETTER_AUTH_URL`, optional `NEXT_PUBLIC_BETTER_AUTH_URL`, and optional `VERCEL_URL`.

### Supabase

- Supabase is used for private storage flows and browser/admin clients are already in place.
- Upload-backed features need a real Supabase project and valid keys.
- App-level business scoping is enforced in queries and server actions today.
- SQL RLS helpers and policies exist in migrations, but the runtime does not currently inject `app.current_user_id` into the Postgres session, so DB-session RLS is not the primary enforcement path yet.

### Resend

- Password reset emails, public inquiry notifications, quote delivery, and owner quote notifications are implemented.
- `RESEND_FROM_EMAIL` must use a domain verified in Resend. Personal mailbox domains like `gmail.com` belong in `RESEND_REPLY_TO_EMAIL`, not the sender field.
- Password reset and inquiry notification email sending are best-effort when Resend is not configured.
- Quote sending intentionally fails when Resend is not configured.

### OpenRouter

- Inquiry assistant generation is wired server-side.
- The AI action returns a safe error if OpenRouter is not configured.
- Automated checks do not currently exercise a live OpenRouter request.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run check
npm run test:e2e
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
npm run db:seed-demo
```

## Validation

The current baseline verification flow is:

```bash
npm run check
npm run build
npm run test:e2e
```
