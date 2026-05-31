# Crisp Support Integration

This project integrates Crisp chat for public-facing pages and adds a support surface inside business settings.

## 1) Configure Crisp Website ID

Add this variable to your environment configuration:

```bash
CRISP_WEBSITE_ID=your-crisp-website-id
```

Where to get it:
- In Crisp, open your website settings and copy the Website ID used by the Web SDK.

Where it is used in code:
- `lib/env.ts` validates and exposes `CRISP_WEBSITE_ID`.
- `components/integrations/crisp/crisp-chat-widget-server.tsx` passes it to the client initializer.

## 2) Install dependency

`crisp-sdk-web` is used for the official Crisp Web SDK integration.

```bash
npm install crisp-sdk-web
```

## 3) Widget route behavior

Global Crisp widget is mounted in:
- `app/(marketing)/layout.tsx` - for all marketing pages
- `app/(business)/[businessSlug]/settings/support/page.tsx` - for the business settings support page

It is intentionally not mounted in:
- public inquiry/quote pages (`app/(public)/layout.tsx`)
- authenticated business dashboard pages (except support settings)
- admin/auth/onboarding route groups

This keeps marketing chat available and provides in-app support access through the dedicated support settings page.

## 4) Business settings Support page

Support page route:
- `/{businessSlug}/settings/support`

It provides:
- quick explanation of support channels,
- support availability + contact email,
- links to documentation/FAQ/contact,
- actions to open Crisp chat/help center inside dashboard context.

## 5) Knowledge CSV datasets for Crisp AI workflows

Generated files:
- `support/knowledge/faq.csv`
- `support/knowledge/canned_responses.csv`
- `support/knowledge/support_intents.csv`
- `support/knowledge/onboarding_guides.csv`

Generate or refresh datasets:

```bash
npm run support:csv
```

How to use:
- Import these CSVs into your Crisp help workflows, bot training, or internal support assistant tooling.
- `faq.csv` and `onboarding_guides.csv` provide structured long-form knowledge.
- `canned_responses.csv` provides agent-ready response templates.
- `support_intents.csv` helps with intent classification/routing tests.

## 6) Notes for future updates

- Keep all support copy and channels aligned with owner-first workflow support (inquiry -> quote -> follow-up -> job -> invoice).
- If support hours or links change, update `app/(business)/[businessSlug]/settings/support/page.tsx`.
- If Crisp is not configured, support page actions fail gracefully and users can still contact support via email.
