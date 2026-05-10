# Requo Deployment Setup

## Summary

Requo deploys as a Next.js app with a Postgres database, Supabase storage credentials,
Better Auth secrets, transactional email providers, AI provider keys, and optional billing providers.

The deployed product is aimed at owner-led service businesses that need to capture
inquiries, turn them into quotes, share or send quotes, follow up, and track quote
views plus customer responses from one place.

## Environment Variables

### Core runtime

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `APP_TOKEN_HASH_SECRET`
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
- PayMongo and Paddle variables when checkout is enabled

## Better Auth Checklist

- Set `BETTER_AUTH_SECRET` to a stable production secret.
- Set `BETTER_AUTH_URL` to the canonical public app origin.
- Set `NEXT_PUBLIC_BETTER_AUTH_URL` only if you need an explicit browser-facing auth route override.
- Keep preview and production origins aligned with Better Auth trusted origins.
- If you deploy on Vercel, `VERCEL_URL` can be used to allow preview-origin requests.
- Add provider credentials only for the OAuth providers you want to expose:
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
  - Configure transactional email for optional magic-link sign-in.
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

## Email Delivery Checklist

- Configure providers in fallback order: Resend, Mailtrap, then Brevo.
- Create API keys for each provider you want to enable: `RESEND_API_KEY`, `MAILTRAP_API_TOKEN`, and `BREVO_API_KEY`.
- Set `EMAIL_DOMAIN` to the verified sending domain. For this Requo environment, use `test.requo.app`.
- Configure senders centrally with `EMAIL_FROM_DEFAULT`, `EMAIL_FROM_NOTIFICATIONS`, `EMAIL_FROM_SYSTEM`, `EMAIL_FROM_QUOTES`, and `EMAIL_FROM_SUPPORT`.
- Do not use personal mailbox domains such as `gmail.com`, `outlook.com`, `hotmail.com`, `yahoo.com`, or `icloud.com` for sender addresses.
- Set `RESEND_REPLY_TO_EMAIL` to the reply target mailbox if customer replies should go to a different inbox.
- Verify the sending domain in Resend, Mailtrap, and Brevo before relying on that provider in production.
- Publish the SPF, DKIM, and DMARC DNS records required by the providers you enable. Provider-specific domain verification is handled outside code.
- Expect password reset and inquiry notification email flows to be best-effort when email providers are absent.
- Expect quote sending to fail clearly when no email provider is configured.

## AI Provider Checklist

- Configure one or more AI providers: `GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY`.
- The router tries configured providers in this order: Groq, Gemini, then OpenRouter.
- Keep all AI API keys server-only.
- Plan separate monitoring for rate limits, credit usage, and model-availability failures.

## Billing Checklist

- Billing is business-scoped. `business_subscriptions` is authoritative and `businesses.plan` is a read cache.
- Configure PayMongo for QRPh/PHP checkout if serving Philippines payments:
  - `PAYMONGO_SECRET_KEY`
  - `PAYMONGO_PUBLIC_KEY`
  - `PAYMONGO_WEBHOOK_SECRET`
- Configure Paddle for recurring card/USD checkout:
  - `PADDLE_API_KEY`
  - `PADDLE_WEBHOOK_SECRET`
  - `PADDLE_PRO_PRICE_ID`
  - `PADDLE_PRO_YEARLY_PRICE_ID`
  - `PADDLE_BUSINESS_PRICE_ID`
  - `PADDLE_BUSINESS_YEARLY_PRICE_ID`
  - `PADDLE_ENVIRONMENT`
  - `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
  - `NEXT_PUBLIC_PADDLE_ENVIRONMENT`
- Point webhooks at:
  - `/api/billing/paymongo/webhook`
  - `/api/billing/paddle/webhook`
- Read `docs/setup/billing.md` before enabling live checkout.

## Rollout Order

1. Provision the database and set `DATABASE_URL` plus `DATABASE_MIGRATION_URL`.
2. Set Better Auth envs and deploy the app at the intended public origin.
3. Run `npm run db:migrate`.
4. Configure Supabase storage credentials and verify upload-backed flows.
5. Configure email providers and verify forgot-password plus quote-send flows.
6. Configure at least one AI provider and verify the inquiry assistant.
7. Configure PayMongo/Paddle if checkout is part of the deployment.
8. Run the baseline health checks and smoke-test dashboard login, non-member denial, public inquiry submission, quote send/share, and public quote response.

## Current Operational Gaps

- Live provider behavior is not covered by the default automated suite.
- There is no deployment-specific observability layer yet for email, AI provider, PayMongo, or Paddle failures.
- SQL RLS helpers and policies exist, but the app does not currently inject `app.current_user_id` into the Postgres session, so database-session RLS is not the main enforcement path for runtime queries yet.
