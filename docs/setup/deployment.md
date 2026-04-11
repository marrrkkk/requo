# Requo Deployment Setup

## Summary

Requo deploys as a Next.js app with a Postgres database, Supabase storage credentials,
Better Auth secrets, Resend for transactional email, and OpenRouter for AI drafting.

The deployed product is aimed at owner-led service businesses that need to capture
inquiries, qualify leads, send quotes, and follow up from one place.

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

### Optional but recommended

- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `VERCEL_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO_EMAIL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`

## Better Auth Checklist

- Set `BETTER_AUTH_SECRET` to a stable production secret.
- Set `BETTER_AUTH_URL` to the canonical public app origin.
- Set `NEXT_PUBLIC_BETTER_AUTH_URL` only if you need an explicit browser-facing auth route override.
- Keep preview and production origins aligned with Better Auth trusted origins.
- If you deploy on Vercel, `VERCEL_URL` can be used to allow preview-origin requests.
- Add provider credentials only for the OAuth providers you want to expose:
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
  - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and optional `MICROSOFT_TENANT_ID`
- Provider callback URLs use `/api/auth/callback/<provider>`.

## Supabase Checklist

- Provide `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Provide `SUPABASE_JWT_SECRET` so Better Auth users can subscribe to Supabase Realtime for dashboard notifications.
- Use the Supabase pooler host for both database env vars:
  - `DATABASE_URL` on port `6543`
  - `DATABASE_MIGRATION_URL` on port `5432`
- Keep the host, username, password, and database the same between those two values. Only the port should change.
- If the Connect dialog only shows the `6543` pooler string, duplicate it and change the port to `5432` for `DATABASE_MIGRATION_URL`.
- Run the existing Drizzle migrations before exercising storage-backed features.
- The app expects the migrations to manage the private bucket configuration for:
  - `inquiry-attachments`
  - `knowledge-files`
  - `business-assets`
  - `profile-assets`
- Keep private asset access server-side. The current design uses authenticated route handlers to download private files.

Example:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-<region>.pooler.supabase.com:6543/postgres
DATABASE_MIGRATION_URL=postgresql://postgres.<project-ref>:<db-password>@aws-<region>.pooler.supabase.com:5432/postgres
```

## Resend Checklist

- Create a Resend API key.
- Verify the sender domain or sender address.
- Set `RESEND_FROM_EMAIL` to a plain email address on a domain you verified in Resend.
- Do not use personal mailbox domains such as `gmail.com`, `outlook.com`, `hotmail.com`, `yahoo.com`, or `icloud.com` for `RESEND_FROM_EMAIL`.
- Set `RESEND_REPLY_TO_EMAIL` to the reply target mailbox if customer replies should go to a different inbox.
- Expect password reset and inquiry notification email flows to be best-effort when Resend is absent.
- Expect quote sending to fail clearly when Resend is absent.

## OpenRouter Checklist

- Create an OpenRouter API key.
- Set `OPENROUTER_API_KEY`.
- Set `OPENROUTER_DEFAULT_MODEL` to the production default model ID you want to use.
- Keep the API key server-only.
- Plan separate monitoring for rate limits, credit usage, and model-availability failures.

## Rollout Order

1. Provision the database and set `DATABASE_URL` plus `DATABASE_MIGRATION_URL`.
2. Set Better Auth envs and deploy the app at the intended public origin.
3. Run `npm run db:migrate`.
4. Configure Supabase storage credentials and verify upload-backed flows.
5. Configure Resend and verify forgot-password plus quote-send flows.
6. Configure OpenRouter and verify the inquiry assistant.
7. Run the baseline health checks and smoke-test the public inquiry page, onboarding starter templates, dashboard login, quote send, and public quote response.

## Current Operational Gaps

- Live provider behavior is not covered by the default automated suite.
- There is no deployment-specific observability layer yet for Resend or OpenRouter failures.
- SQL RLS helpers and policies exist, but the app does not currently inject `app.current_user_id` into the Postgres session, so database-session RLS is not the main enforcement path for runtime queries yet.
