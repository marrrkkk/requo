# QuoteFlow Local Setup

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL
- A `.env` file copied from `.env.example`

## Environment Setup

Copy `.env.example` to `.env` and fill in the values you want to use locally.

Minimum local requirements:

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional but commonly needed:

- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`

## Provider Expectations

### Better Auth

- Set `BETTER_AUTH_SECRET` to a secret with at least 32 characters.
- Set `BETTER_AUTH_URL` to the exact origin you will open in the browser.
- `NEXT_PUBLIC_BETTER_AUTH_URL` is optional. Keep it aligned with `/api/auth` when you set it.
- If you switch between `localhost` and `127.0.0.1`, update the auth URL to match the browser origin.

### Supabase

- Supabase-backed uploads and asset downloads need a real Supabase project.
- The repo validates Supabase envs even when you are not actively using upload flows.
- Local builds and tests can use placeholder Supabase values when you are not exercising storage-backed functionality.
- Knowledge uploads, inquiry attachments, and workspace logos need a real Supabase project and valid service-role credentials.

### Resend

- Leave `RESEND_API_KEY` blank if you do not need live email locally.
- Password reset and inquiry notification emails will be skipped when Resend is not configured.
- Quote sending intentionally returns an error when Resend is not configured, because the action is explicit and user-facing.

### OpenRouter

- Leave `OPENROUTER_API_KEY` blank if you do not need live AI locally.
- The inquiry assistant returns a configuration-related error when OpenRouter is not configured.

## Local Bootstrap

### 1. Install dependencies

```bash
npm install
```

### 2. Run database migrations

```bash
npm run db:migrate
```

### 3. Seed demo data

```bash
npm run db:seed-demo
```

Default demo values:

- Owner name: `Morgan Lee`
- Owner email: `demo@quoteflow.local`
- Owner password: `ChangeMe123456!`
- Workspace name: `BrightSide Print Studio`
- Workspace slug: `brightside-print-studio`
- Demo sent quote token: `demoquote1002senttoken`
- Demo expired quote token: `demoquote1005expiredtoken`

The seed supports overriding these values through the `DEMO_*` env variables in `.env`.

### 4. Start the app

```bash
npm run dev
```

Open the app at the same origin configured in `BETTER_AUTH_URL`.

## Verification

Run the repo health checks:

```bash
npm run check
npm run build
npm run test:e2e
```

## Notes for Local Testing

- The Playwright suite starts its own local server, sets `BETTER_AUTH_URL` to `127.0.0.1`, and disables live Resend and OpenRouter calls.
- The E2E suite uses the seeded demo workspace and fixed public quote tokens.
- The current automated suite does not cover live storage uploads, live Resend delivery, or live OpenRouter generation.
