# Service Business SEO Positioning

## Problem Statement

Requo's public copy described the product as being for “owner-led” businesses. That wording narrows the audience unnecessarily and appears inconsistently across landing, pricing, authentication, legal, and machine-readable content. It also makes the product less discoverable for service-business searches that do not include an owner-specific qualifier.

## Solution

Position Requo as quote and inquiry management software for service businesses. Keep the product's actual workflow and boundaries clear: capture inquiries, create and send quotes, track quote responses, manage follow-ups, use AI-assisted drafting, and review analytics. Remove “owner-led” from customer-facing positioning while retaining accurate role and plan details where they describe permissions.

## User Stories

1. As a service-business operator, I want the landing page to explain Requo in service-business language, so that I can quickly tell whether it fits my workflow.
2. As a service-business operator, I want the page title and description to include quote and inquiry management terms, so that I can find Requo through relevant searches.
3. As a prospective customer, I want the FAQ to describe inquiry capture, quote creation, sharing, and response tracking, so that I can evaluate the complete workflow.
4. As a prospective customer, I want to know whether customers need an account to view a quote, so that I understand the buying experience.
5. As a prospective customer, I want to know whether phone, referral, and direct-message inquiries can be logged, so that I can compare Requo with my current process.
6. As a prospective customer, I want AI drafting explained as reviewable and grounded in my business context, so that I understand what AI does and what remains under my control.
7. As a prospective customer, I want manual and automatic follow-ups distinguished, so that I do not assume every plan sends automated email.
8. As a prospective customer, I want quote statuses and response tracking explained, so that I know how Requo helps me monitor opportunities.
9. As a prospective customer, I want unsupported capabilities such as invoicing, dispatch, and scheduling called out clearly, so that I do not buy the product expecting them.
10. As a prospective customer, I want plan prices, annual billing, and business-scoped subscriptions stated plainly, so that I can estimate cost accurately.
11. As a prospective customer, I want to understand the owner Assistant and public customer Agent, so that I can decide whether AI features fit my workflow.
12. As a prospective customer, I want to know that products, quote templates, business knowledge, analytics, and CSV exports are available, so that I can assess operational fit.
13. As an AI search engine, I want concise, self-contained capability and plan descriptions, so that I can accurately summarize Requo.
14. As a crawler, I want an agent-readable product overview, so that key capabilities and URLs can be extracted without client-side rendering.

## Implementation Decisions

- Use “service businesses” as the broad public positioning term.
- Retain “solo owners,” “small teams,” and role names only when describing plan audiences or permissions.
- Keep the landing-page FAQ as the canonical human-readable FAQ source and continue generating FAQ structured data from it.
- Include shipped capabilities in the landing feature list: inquiries, quotes, follow-ups, AI drafting, and analytics.
- Describe automatic follow-up email as a Pro and Business capability; manual reminders remain available across plans.
- Describe subscriptions as business-scoped. Free includes one free business; additional businesses require their own paid subscription.
- Publish an agent-readable `/llms.txt` route and keep the public markdown discovery route aligned with it.
- Do not add schema, database fields, or new product workflows for this positioning update.

## Testing Decisions

- Run targeted ESLint on all changed marketing, metadata, and route modules.
- Verify every FAQ item is assigned to a visible landing-page FAQ group.
- Run repository SEO audits and record unrelated pre-existing failures separately.
- Review public copy for unsupported claims and remaining customer-facing “owner-led” references.

## Out of Scope

- New product functionality, billing behavior, or plan entitlements.
- New service-business vertical pages or programmatic SEO pages.
- Changes to internal domain terminology where “owner” identifies a role or permission.
- External Search Console, analytics, or AI citation measurement.

## Further Notes

The existing domain glossary already distinguishes owner-facing Assistant from customer-facing Agent. This spec changes public positioning only and does not alter that terminology boundary.
