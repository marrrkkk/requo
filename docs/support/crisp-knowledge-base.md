# Requo Support Knowledge Base

## Product Overview

Requo helps owner-led service businesses manage the inquiry-to-quote workflow:

1. Capture inquiries from public forms or manual entry.
2. Qualify and organize requests in a business-scoped inbox.
3. Build, share, or email professional quotes.
4. Track views and customer responses.
5. Schedule and send follow-ups so open opportunities do not go quiet.

## Current Features

- Public inquiry pages, configurable forms, custom fields, attachments, and duplicate detection
- Inquiry notes, statuses, qualification, and CSV export
- Quote editor, Products library, revisions, expiry, public quote pages, and accept/reject responses
- Requo email delivery, custom quote email templates, and public-link sharing
- Manual follow-ups, automatic follow-ups on eligible plans, reminders, and AI-assisted follow-up drafting
- Conversion and workflow analytics, scheduled reports, notifications, audit logs, and business members
- AI quote drafting grounded in inquiry details, Products, and uploaded knowledge files
- Multiple businesses per account with business-scoped billing and role-based access

The current product does not include jobs, invoices, calendar scheduling, dispatch, a mobile app, marketplace features, or a general-purpose AI chat assistant.

## Plans

Plan names and entitlements are defined in `lib/plans/entitlements.ts` and plan metadata in `lib/plans/plans.ts`. Do not promise limits or features that are not present there. All plans retain visibility of paid destinations; locked features show an upgrade prompt.

- **Free**: inquiry and quote workflow for one business, follow-ups, AI quote drafting, Products, knowledge files, and exports within the current usage limits.
- **Pro**: Free plus multiple forms, inquiry-page customization, quote email templates, automatic follow-ups, advanced analytics, scheduled reports, and branding removal.
- **Business**: Pro plus team members, roles, and audit logs.

Subscriptions are business-scoped and handled through Polar. A subscription on one business does not unlock another business.

## Common Questions

### Getting started

**How do I create my first business?**
After signup, onboarding guides you through selecting a starter template, naming the business, and configuring the first inquiry workflow. Everything remains editable later.

**What is a business slug?**
A slug is the URL-safe identifier used in public links, for example `/b/brightside-print-studio`.

**Can I manage more than one business?**
Yes. Businesses are separate workspaces with their own data, settings, members, and subscription state.

### Inquiries and forms

**How do customers submit an inquiry?**
Share the public business page at `/b/<business-slug>` or a form at `/inquire/<business-slug>/<form-slug>`.

**Can I customize the inquiry experience?**
Yes. Owners can edit form fields and public inquiry-page content from the business dashboard. Pro and Business plans unlock additional customization and forms.

**How does duplicate detection work?**
Requo compares contact details and inquiry content to flag likely duplicates for review. It does not delete submissions automatically.

### Quotes and follow-ups

**How do I create a quote?**
Create one from an inquiry or from the Quotes area. Add Products or custom line items, review the totals and terms, then save, share, or send it.

**Can customers respond online?**
Yes. Public quote pages record views and allow customers to accept or reject a quote with an optional comment.

**How do I follow up?**
Create a follow-up from an inquiry or quote, choose a due time, and write or generate a draft message. Automatic follow-ups are available on eligible plans.

### Team and billing

**How do I invite a teammate?**
Open `/<business-slug>/members`. Team invitations and role management require the Business plan.

**Where are products managed?**
Products are a main dashboard destination at `/<business-slug>/products`; the old settings pricing routes are removed.

**Where is billing managed?**
Open `/<business-slug>/settings/billing`. Checkout and customer self-service are provided by Polar.

### AI and knowledge files

**What can AI help with?**
AI can draft or improve quotes and follow-up messages using the current inquiry, Products, and business knowledge context. Review all generated content before sending.

**Can I upload reference material?**
Yes, upload supported knowledge files from the business workflows when the feature is enabled. Files are scoped to the business and are not public.

**Is my data used to train AI models?**
Requo sends the minimum context needed for the requested operation through the configured provider. It does not use customer data to train a Requo model.

### Troubleshooting

**A quote will not send.**
Confirm the quote has a valid customer email, is still sendable, and the business email sender is configured. Check the business email settings and current plan usage. Sharing the public quote link remains available when email delivery is unavailable.

**A public link is not working.**
Confirm the business slug or quote token is complete and that the quote is not draft or voided. Expired quotes cannot be accepted online.

**The AI action is unavailable.**
AI requires a configured provider and available plan credits. Try again later or continue with the manual editor.

**A file upload fails.**
Check the file type and plan size limit, then retry. Private files require valid Supabase storage configuration.

## Support Escalation

Escalate data loss, security issues, billing errors, authorization failures, or incidents affecting multiple businesses to engineering. Include the business slug, relevant record id, timestamp, and exact error message. Do not include secrets or full customer documents.

## Internal Architecture Notes

- Auth: Better Auth
- Database: PostgreSQL with Drizzle ORM
- Storage and realtime notifications: Supabase
- Email: Resend, then Mailtrap/Brevo fallback
- AI: server-side multi-provider routing through `lib/ai`
- Billing: Polar
- Background processing: Inngest

All authenticated reads and mutations must remain business-scoped and role-aware.
