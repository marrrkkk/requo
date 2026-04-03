# QuoteFlow Deployment Setup

## Summary

QuoteFlow deploys cleanly as a Next.js app with a Postgres database, Supabase storage credentials, Better Auth secrets, Resend for transactional email, and OpenRouter for AI drafting.

## Environment Variables

### Core runtime

- `DATABASE_URL`
- `DATABASE_DIRECT_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

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

## Supabase Checklist

- Provide `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Run the existing Drizzle migrations before exercising storage-backed features.
- The app expects the migrations to manage the private bucket configuration for:
  - `inquiry-attachments`
  - `knowledge-files`
  - `workspace-assets`
- Keep private asset access server-side. The current design uses authenticated route handlers to download private files.

## Resend Checklist

- Create a Resend API key.
- Verify the sender domain or sender address.
- Set `RESEND_FROM_EMAIL` to a plain verified email address.
- Set `RESEND_REPLY_TO_EMAIL` to the reply target mailbox.
- Expect password reset and inquiry notification email flows to be best-effort when Resend is absent.
- Expect quote sending to fail clearly when Resend is absent.

## OpenRouter Checklist

- Create an OpenRouter API key.
- Set `OPENROUTER_API_KEY`.
- Set `OPENROUTER_DEFAULT_MODEL` to the production default model ID you want to use.
- Keep the API key server-only.
- Plan separate monitoring for rate limits, credit usage, and model-availability failures.

## Rollout Order

1. Provision the database and set `DATABASE_URL` plus `DATABASE_DIRECT_URL`.
2. Set Better Auth envs and deploy the app at the intended public origin.
3. Run `npm run db:migrate`.
4. Configure Supabase storage credentials and verify upload-backed flows.
5. Configure Resend and verify forgot-password plus quote-send flows.
6. Configure OpenRouter and verify the inquiry assistant.
7. Run the baseline health checks and smoke-test the public inquiry page, dashboard login, quote send, and public quote response.

## Current Operational Gaps

- Live provider behavior is not covered by the default automated suite.
- There is no deployment-specific observability layer yet for Resend or OpenRouter failures.
- SQL RLS helpers and policies exist, but the app does not currently inject `app.current_user_id` into the Postgres session, so database-session RLS is not the main enforcement path for runtime queries yet.
