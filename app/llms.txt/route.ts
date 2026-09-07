import { NextResponse } from "next/server";

const llmsContent = `# Requo

Requo is quote and inquiry management software for service businesses.

## What Requo does

- Capture inquiries through public forms, manual entry, or a customer-facing AI Agent.
- Create professional quotes with products, pricing entries, templates, and AI-assisted drafting.
- Share quotes by public link or email and track viewed, accepted, rejected, expired, and voided status.
- Create follow-up reminders for inquiries and quotes; Pro and Business can send automatic follow-up emails.
- Review conversion and workflow analytics, scheduled reports, and CSV exports.
- Use the owner Assistant to search business data and perform supported inquiry and quote operations.

## Plans

- Free: $0 for one business; core inquiry-to-quote workflow, manual follow-ups, exports, one live form, and about 10 AI quote drafts per month.
- Pro: $9/month or $90/year; automatic follow-ups, more AI drafting, custom emails, up to 5 live forms, and advanced analytics.
- Business: $24/month or $240/year; up to 5 members with roles, audit logs, higher limits, and unlimited pricing library entries.

Annual billing includes two months free. Paid subscriptions are billed per business.

## Key pages

- Home: /
- Pricing: /pricing
- Public inquiry pages: /inquire/[slug]
- Public customer Agent: /b/[slug]/chat
`;

export function GET() {
  return new NextResponse(llmsContent, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
