# Requo Local Setup

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL
- A `.env` file copied from `.env.example`

## Environment Setup

Copy `.env.example` to `.env` and fill in the values you want to use locally.

Minimum local requirements:

- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

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
- Social sign-in is optional. Set provider credentials only for the providers you want to enable:
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
  - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and optional `MICROSOFT_TENANT_ID`
- Provider callback URLs use `/api/auth/callback/<provider>`.

### Supabase

- Supabase-backed uploads and asset downloads need a real Supabase project.
- The repo validates Supabase envs even when you are not actively using upload flows.
- Local builds and tests can use placeholder Supabase values when you are not exercising storage-backed functionality.
- Knowledge uploads, inquiry attachments, business logos, and profile avatars need a real Supabase project and valid service-role credentials.
- Realtime dashboard notifications need `SUPABASE_JWT_SECRET` from the Supabase project API settings. Without it, the bell still renders server data but will not live-update.
- Use your Supabase pooler host for both database env vars:
  - `DATABASE_URL` on port `6543`
  - `DATABASE_MIGRATION_URL` on port `5432`
- Keep the host, username, password, and database the same between those two values. Only the port should change.
- If the Supabase dashboard only shows you a `6543` pooler string, copy it and change the port to `5432` for `DATABASE_MIGRATION_URL`.
- Avoid using the direct `db.<project-ref>.supabase.co:5432` string for migrations unless your machine has working IPv6 access or your project has the IPv4 add-on.

Example:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-<region>.pooler.supabase.com:6543/postgres
DATABASE_MIGRATION_URL=postgresql://postgres.<project-ref>:<db-password>@aws-<region>.pooler.supabase.com:5432/postgres
```

Where to get it in Supabase:

1. Open your project dashboard.
2. Open the `Connect` dialog.
3. Copy the pooler connection string.
4. Use that string as `DATABASE_URL`.
5. Copy it again and change only the port from `6543` to `5432` for `DATABASE_MIGRATION_URL`.

### Resend

- Leave `RESEND_API_KEY` blank if you do not need live email locally.
- Set `RESEND_FROM_EMAIL` to an address on a domain you verified in Resend.
- Do not use consumer mailbox domains such as `gmail.com`, `outlook.com`, `hotmail.com`, `yahoo.com`, or `icloud.com` for `RESEND_FROM_EMAIL`.
- Keep your normal inbox in `RESEND_REPLY_TO_EMAIL` if you want customer replies to go there.
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
- Owner email: `demo@requo.local`
- Owner password: `ChangeMe123456!`
- Business name: `BrightSide Print Studio`
- Business slug: `brightside-print-studio`
- Demo sent quote token: `demoquote1002senttoken`
- Demo expired quote token: `demoquote1005expiredtoken`

The seed also adds two extra sample businesses, three inquiry forms per business, and several hundred inquiries and quotes while keeping the primary BrightSide demo workspace stable for local testing.

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
- The E2E suite uses the seeded demo business and fixed public quote tokens.
- The current automated suite does not cover live storage uploads, live Resend delivery, or live OpenRouter generation.

### Canonical Dashboard Routes

Use one canonical route set in docs and tests:

- Dashboard home: `/businesses/<slug>/dashboard`
- Inquiries: `/businesses/<slug>/dashboard/inquiries`
- Quotes: `/businesses/<slug>/dashboard/quotes`
- Forms: `/businesses/<slug>/dashboard/forms`
- Settings hub: `/businesses/<slug>/dashboard/settings`
- Settings sections:
  - General: `/settings/general`
  - Profile: `/settings/profile`
  - Saved replies: `/settings/replies`
  - Quote defaults: `/settings/quote`
  - Pricing library: `/settings/pricing`
  - Knowledge base: `/settings/knowledge`

### Product Notes

- Onboarding starts with one guided starter template and keeps everything editable later.
- The current starter templates are:
  - `Agency / Studio`
  - `Consultant / Professional Services`
  - `Contractor / Home Service`
  - `General Service Business`
- Public inquiry pages can include supporting cards, optional showcase images, and editable intro copy.

Legacy aliases under settings are kept only as redirects for backward compatibility. Do not use alias paths in new docs or tests.
