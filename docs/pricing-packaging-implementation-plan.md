# Pricing and Packaging Implementation Plan

## Document Purpose

This document is the implementation specification for simplifying Requo's Free,
Pro, and Business plans. It is written so another AI or engineer can implement
the change without making new product or pricing decisions.

The implementation must preserve Requo's business-scoped billing architecture,
keep the core inquiry-to-quote workflow genuinely usable on Free, and make paid
plans valuable through time savings, professional presentation, higher
variable-cost allowances, and team access.

## Current Repository Context

The current worktree is undergoing a broader product simplification. Several
routes and features are being removed or reshaped, including automations, jobs,
invoices, general AI chat, and parts of the knowledge UI. Pricing implementation
must be based on the product that remains after those changes, not on stale
documentation or deleted feature directories.

Before implementing this plan:

1. Re-read the current `AGENTS.md`, `DESIGN.md`, and
   `.agents/skills/requo-repo-guide/SKILL.md`.
2. Inspect the final state of `lib/plans`, `lib/billing`, the marketing pricing
   components, and all changed or deleted product routes.
3. Do not restore deleted features merely because old pricing copy mentions
   them.
4. Preserve unrelated user changes in the dirty worktree.

## Product Decisions

These decisions are final for this implementation:

- Requo keeps three plans: Free, Pro, and Business.
- The primary customer is a solo service-business owner.
- Free must support the complete remaining inquiry-to-quote workflow.
- Pro is primarily purchased to save time and present a more professional
  customer experience.
- Business is primarily purchased for small-team access and control.
- Each paid subscription belongs to one business.
- One owner may operate one active Free business.
- Existing records must never become hidden or unreadable because a usage limit
  was reached.
- Core record counts are unlimited. Do not limit inquiries, quotes, customers,
  accepted quotes, or stored historical records.
- Manual public-link sharing remains unlimited.
- Limits should apply mainly to variable-cost or expansion actions: AI use,
  Requo-hosted email delivery, live forms, file size, knowledge sources, pricing
  library size, and team members.
- Basic inquiry and quote CSV export is available on Free.
- Do not market deleted, unfinished, or roadmap-only features.

## Final Prices

All values use the smallest currency unit in code.

| Plan | USD monthly | USD yearly | PHP monthly | PHP yearly |
| --- | ---: | ---: | ---: | ---: |
| Pro | $9.00 | $90.00 | PHP 499 | PHP 4,990 |
| Business | $24.00 | $240.00 | PHP 1,299 | PHP 12,990 |

Annual billing gives two months free. Public copy should say "Two months free"
instead of claiming a percentage discount. The existing price-formatting helper
should continue to render the correct currency symbol.

## Final Plan Matrix

### Free

Positioning: for a solo owner running one business and completing the core
inquiry-to-quote workflow.

Included capabilities:

- One active Free business per owner.
- One member: the owner.
- Unlimited inquiries.
- Unlimited quotes and quote revisions.
- Unlimited public inquiry submissions.
- Unlimited manual sharing of public quote links.
- Public quote view and accept/reject tracking.
- Customer history.
- Manual follow-ups with no active-record cap.
- Basic dashboard overview.
- Basic inquiry and quote CSV exports.
- One live inquiry form.
- Three custom fields per form.
- File attachments up to 5 MB per public upload.
- Fifteen Requo quote-email sends per calendar month.
- Three Requo quote-email sends per UTC day.
- Thirty weighted AI credits per calendar month, equivalent to approximately
  ten new quote drafts when a draft costs three credits.
- Ten pricing-library entries.
- Five knowledge sources used for grounded quote generation.
- Requo branding remains visible on customer-facing pages.

Not included:

- Automatic follow-ups.
- Custom quote email templates.
- Multiple live inquiry forms.
- Advanced analytics and scheduled reports.
- Inquiry-page visual customization beyond the shared Free presentation.
- Requo watermark removal.
- Additional members, team roles, or audit-log access.

### Pro

Positioning: for a solo owner who wants Requo to save more time and present a
more professional customer experience.

Included capabilities:

- Everything in Free except Free-specific limits and branding restrictions.
- One subscribed business.
- One member: the owner.
- Five live inquiry forms.
- Ten custom fields per form.
- File attachments up to 25 MB per public upload.
- Two hundred Requo quote-email sends per calendar month.
- Twenty Requo quote-email sends per UTC day.
- One hundred fifty weighted AI credits per calendar month, equivalent to
  approximately fifty new quote drafts.
- Fifty pricing-library entries.
- Twenty-five knowledge sources.
- Automatic quote follow-ups where the surviving product supports them.
- Custom quote email templates.
- Inquiry-page customization.
- Advanced analytics and scheduled analytics reports.
- Requo watermark removal.
- All existing data-export capabilities available to an owner.

Pro does not include members or team-role management.

### Business

Positioning: for a small team operating one business together.

Included capabilities:

- Everything in Pro.
- Up to five members, including the owner.
- Existing supported roles and permissions.
- Business audit-log access.
- Ten live inquiry forms.
- Twenty-four custom fields per form.
- File attachments up to 50 MB per public upload.
- Five hundred Requo quote-email sends per calendar month.
- Fifty Requo quote-email sends per UTC day.
- Five hundred weighted AI credits per calendar month, equivalent to
  approximately 166 new quote drafts.
- Unlimited pricing-library entries.
- Fifty knowledge sources.

Do not promise a support SLA or "priority support" until an operational support
process exists. Do not add seat add-ons or usage add-ons in this version.

## Public Pricing Language

Use outcome-oriented language and avoid implementation terminology.

Recommended plan descriptions:

- Free: "Run your inquiry and quote workflow for one business."
- Pro: "Save time with automatic follow-ups, more AI drafting, custom emails,
  and advanced insights."
- Business: "Give a small team shared access, roles, and higher limits."

Recommended hero copy:

> Start free and run the complete inquiry-to-quote workflow. Upgrade when you
> want Requo to handle more of the follow-up, drafting, and presentation work.

Customer-facing AI allowance labels:

- Free: "About 10 AI quote drafts per month"
- Pro: "About 50 AI quote drafts per month"
- Business: "About 165 AI quote drafts per month"

Add a short clarification near the comparison table:

> AI drafting includes new drafts and revisions, so actual usage varies by the
> action performed.

Do not display both "AI credits" and "AI generations" as separate limits.

## Canonical Plan Configuration

### Entitlements

Update `lib/plans/entitlements.ts` so feature names describe the surviving
product. The final variable feature set should be:

```ts
export const planFeatures = [
  "analyticsConversion",
  "analyticsWorkflow",
  "multipleForms",
  "inquiryPageCustomization",
  "emailTemplates",
  "aiQuoteDrafting",
  "quoteLibrary",
  "knowledgeBase",
  "exports",
  "removeWatermark",
  "followUps",
  "autoFollowUps",
  "members",
  "auditLogs",
] as const;
```

Final access policy:

| Feature | Free | Pro | Business |
| --- | :---: | :---: | :---: |
| Basic dashboard | Yes | Yes | Yes |
| Customer history | Yes | Yes | Yes |
| Manual follow-ups | Yes | Yes | Yes |
| AI quote drafting | Yes | Yes | Yes |
| Quote/pricing library | Yes | Yes | Yes |
| Grounding knowledge sources | Yes | Yes | Yes |
| Inquiry and quote exports | Yes | Yes | Yes |
| Advanced analytics | No | Yes | Yes |
| Multiple forms | No | Yes | Yes |
| Inquiry-page customization | No | Yes | Yes |
| Email templates | No | Yes | Yes |
| Automatic follow-ups | No | Yes | Yes |
| Remove watermark | No | Yes | Yes |
| Members | No | No | Yes |
| Audit logs | No | No | Yes |

Implementation rules:

- Rename `aiAssistant` to `aiQuoteDrafting`; the general assistant is not part
  of the current product direction.
- Features that are universally available may remain in the entitlement sets
  if keeping the gate avoids unnecessary churn. Their `getRequiredPlan()` value
  must be `null`.
- `exports` must be granted to Free, Pro, and Business for inquiry and quote
  exports.
- Analytics-specific report exports remain protected by their analytics
  entitlement rather than the generic `exports` entitlement.
- Add `auditLogs` only if there is a surviving business audit-log surface. If
  that surface was removed by the product simplification, omit the public claim
  and the entitlement instead of rebuilding it as part of pricing.

### Usage Limits

Refactor `lib/plans/usage-limits.ts` to remove duplicated and obsolete keys.
The target key set is:

```ts
export const usageLimitKeys = [
  "aiWeightedCreditsPerMonth",
  "requoQuoteEmailsPerDay",
  "requoQuoteEmailsPerMonth",
  "freeBusinessesPerOwner",
  "membersPerBusiness",
  "liveFormsPerBusiness",
  "pricingEntriesPerBusiness",
  "knowledgeSourcesPerBusiness",
  "customFieldsPerForm",
  "publicInquiryAttachmentMaxBytes",
] as const;
```

Final values:

| Limit | Free | Pro | Business |
| --- | ---: | ---: | ---: |
| Weighted AI credits/month | 30 | 150 | 500 |
| Requo quote emails/day | 3 | 20 | 50 |
| Requo quote emails/month | 15 | 200 | 500 |
| Free businesses/owner | 1 | N/A | N/A |
| Members/business | 1 | 1 | 5 |
| Live forms/business | 1 | 5 | 10 |
| Pricing entries/business | 10 | 50 | Unlimited |
| Knowledge sources/business | 5 | 25 | 50 |
| Custom fields/form | 3 | 10 | 24 |
| Public attachment size | 5 MB | 25 MB | 50 MB |

Remove these keys and update all call sites:

- `inquiriesPerMonth`
- `quotesPerMonth`
- `aiLineItemGenerationsPerMonth`
- `businessesPerWorkspace`
- `membersPerWorkspace`
- `liveFormsPerWorkspace`
- `businessesPerPlan`
- `activeFollowUps`
- `activeJobsPerBusiness`

These removals encode intentional product invariants: core records and manual
follow-ups are not capped, and business billing is not an account-wide bundle.

### AI Accounting

Make `lib/plans/usage-limits.ts` the source of truth for monthly AI limits.
Remove the independent hardcoded `PLAN_LIMITS` values from
`lib/ai/usage-limiter.ts`, or derive the exported compatibility constant from
`getUsageLimit(plan, "aiWeightedCreditsPerMonth")`.

Retain the current weights unless product behavior has changed:

```ts
quote_draft: 3
quote_improvement: 2
```

AI usage must be enforced at the business level because subscriptions are
business-scoped. Remove the user-wide quota rejection that sums AI activity
across all of an owner's businesses. A user with two separately paid businesses
must receive each business's full allowance.

Keep user-level cooldown protection if it is still needed for abuse control,
but cooldown state must not be presented as plan usage.

### Pricing Catalog

Update `lib/billing/plans.ts` with the final prices. Use exact integer values:

```ts
monthly: {
  pro: { USD: 900, PHP: 49_900 },
  business: { USD: 2_400, PHP: 129_900 },
},
yearly: {
  pro: { USD: 9_000, PHP: 499_000 },
  business: { USD: 24_000, PHP: 1_299_000 },
},
```

Create a small public-safe plan catalog in `lib/plans/catalog.ts` to eliminate
hardcoded feature and highlight arrays in both the public pricing page and the
in-app plan-selection sheet. The catalog should contain only customer-facing
metadata and should derive numeric values through the plan and billing helpers.

Suggested interface:

```ts
type PlanCatalogEntry = {
  id: BusinessPlan;
  label: string;
  audience: string;
  description: string;
  highlights: readonly string[];
};

export const planCatalog: Record<BusinessPlan, PlanCatalogEntry>;
```

Keep the detailed comparison rows in one exported pricing-comparison structure
used by the marketing page. Do not create separate hardcoded copies for desktop,
mobile, checkout, and upgrade-success UI.

## Business-Scoped Subscription Behavior

The authoritative subscription remains `business_subscriptions`; do not move
subscriptions to the user/account level. `businesses.plan` remains a
denormalized read cache synchronized only through
`lib/billing/subscription-service.ts`.

Final business rules:

1. An owner may operate one active business without a paid subscription.
2. Every additional active business must have its own active Pro or Business
   subscription.
3. A Pro subscription does not unlock Pro for sibling businesses.
4. A Business subscription does not grant member access to sibling businesses.
5. Archiving or deleting a Free business frees the owner's one Free slot.
6. Canceling or downgrading a paid business to Free is allowed only when the
   owner has no other active Free business, unless the owner archives another
   Free business during the downgrade flow.

Update `features/businesses/quota.ts`,
`features/businesses/plan-enforcement.ts`, and related create-business UI to use
`freeBusinessesPerOwner` instead of account-wide plan bundle limits.

Additional-business flow:

- If the owner has no active Free business, allow creation on Free.
- If the owner already has an active Free business, require Pro or Business
  selection for the new business.
- Do not create a usable second Free business and then lock it after the fact.
- If checkout is canceled, no paid entitlement should be written.
- Reuse existing checkout and subscription-service paths; do not write directly
  to `business_subscriptions`.

## Existing User and Subscriber Treatment

### Existing Free Owners With Multiple Businesses

Do not automatically lock or delete existing businesses during deployment.

Use a derived legacy-over-limit policy without adding a schema column:

- Existing active Free businesses remain accessible.
- An owner with more than one active Free business cannot create another Free
  business.
- Archiving a legacy Free business does not permit a replacement until the
  owner is back below the new one-business limit.
- Display a neutral billing notice explaining that existing businesses remain
  available but new businesses require their own subscription.

### Existing Paid Subscribers

Before changing Polar product IDs, query production billing data and determine
whether active paid subscriptions exist.

If there are no active paid subscriptions:

- Create the four new Polar products.
- Replace the current product IDs in environment configuration.
- Verify sandbox and production independently.

If active paid subscriptions exist:

- Grandfather their current recurring price until cancellation or an explicit
  plan change.
- Continue resolving legacy product IDs in webhooks.
- Add optional legacy product-ID environment variables or a versioned mapping
  in `lib/billing/polar-products.ts`.
- Map both legacy and new product IDs to the same logical `pro` or `business`
  plan.
- New checkouts must use only the new products.
- Do not silently move an active subscriber to the higher price.

## Limit Enforcement Behavior

Every limit must follow these rules:

- Check authorization and business ownership before checking the plan limit.
- Validate external input with Zod before performing writes or provider calls.
- Block only the attempted action that would exceed the limit.
- Return the current usage and limit when practical.
- Never hide, delete, archive, or make existing records read-only solely because
  the user reached a usage limit.
- Downgrades may prevent creation of new above-limit resources, but existing
  forms, pricing entries, and knowledge sources remain readable and editable.
- When necessary, prevent reactivating another form until usage is below the
  new limit; do not automatically delete or archive forms.
- Cache invalidation must use the existing business and shell tag helpers.

Required limit messages:

- AI: "You've used this month's AI drafting allowance. Upgrade for more drafts."
- Email: "You've reached this month's Requo email limit. You can still copy and
  share the public quote link."
- Forms: "This plan supports {limit} live inquiry form(s). Archive a form or
  upgrade to publish another."
- Pricing library: "This plan supports {limit} saved pricing entries. Remove an
  entry or upgrade to save another."
- Knowledge: "This plan supports {limit} knowledge sources. Remove a source or
  upgrade to add another."
- Members: "Business supports up to 5 members, including the owner."

Upgrade prompts must target the minimum plan returned by `getRequiredPlan()`.
Quota-based prompts on Free and Pro should point to Pro and Business
respectively.

## Export Policy

Remove the generic Pro gate from authenticated inquiry and quote CSV export
routes. Preserve all existing business-scope authorization and filter
validation.

Free export includes the same inquiry and quote columns already produced by the
existing routes. Do not create a deliberately degraded CSV.

Keep these restrictions separate:

- Analytics report exports require the relevant Pro analytics entitlement.
- Audit-log viewing/export requires Business if the audit surface survives.
- A complete compliance/account deletion export remains an ownership and legal
  concern, not a pricing feature.

## UI and Copy Changes

### Public Pricing Page

Update `components/marketing/pricing-page.tsx` and its plan-card dependency to:

- Render prices and limits from canonical helpers.
- Highlight Pro as the recommended plan.
- Keep Free visually credible rather than presenting it as a trial.
- Explain the upgrade boundary in one sentence: pay for time savings,
  professional presentation, higher provider usage, or team access.
- Remove stale rows for deleted jobs, invoices, automations, public AI inquiry
  chat, API access, or other unavailable capabilities.
- Remove duplicate AI rows.
- Group the comparison into no more than four sections:
  Core workflow, Time savings, Presentation and insights, Team.
- Keep the comparison concise on mobile; do not reproduce a dense internal
  quota ledger.

### In-App Upgrade UI

Update the plan-selection sheet, billing status card, upgrade-success modal,
usage banners, and paywall components so they use the same catalog and limits.

Required highlights:

- Free: Complete core workflow, 15 Requo sends, about 10 AI drafts, one form.
- Pro: Auto follow-ups, custom emails and branding, advanced analytics, about 50
  AI drafts.
- Business: Five members, roles, audit logs if available, highest limits.

Do not show `Free plan` as an actionable downgrade inside an upgrade-only modal.
Downgrade controls remain in the billing-management surface.

### Usage UI

The billing status card should show only usage that helps a customer make a
decision:

- AI drafting allowance.
- Requo email sends.
- Live forms when at or near the limit.
- Members for Business.

Do not show pricing-entry, knowledge-source, custom-field, or upload-size meters
on the general billing card. Show those limits contextually where the user adds
the resource.

## Documentation Changes

Update all customer-facing and operator documentation that states plan limits
or prices:

- `docs/setup/billing.md`
- `docs/support/crisp-knowledge-base.md`
- generated support CSV sources under `support/knowledge/`
- `.env.example` comments for Polar product IDs if names change
- pricing-related README content, but only after preserving unrelated README
  edits already in the worktree

Remove stale promises and contradictory values. A repository-wide search for
the following must return only intentional historical or test references:

- `$6.99`, `$16.99`, `$69.90`, `$169.90`
- `100 AI credits`, `500 AI credits`, `2,000 AI credits`
- `2 free businesses`
- `25 members`
- `10 quotes per month`
- `unlimited businesses`
- `workflow automation` in pricing or support claims
- `jobs & invoices` in active pricing claims

## Implementation Sequence

### Phase 0: Reconcile the Surviving Product

1. Finish or establish the final state of the ongoing feature-removal work.
2. Inventory every surviving route and UI surface referenced by pricing.
3. Remove pricing claims for unavailable features before changing entitlements.
4. Record any intentional deviation from this plan in the pull request.

### Phase 1: Canonical Plan Model

1. Update plan metadata and descriptions.
2. Refactor entitlement names and plan membership.
3. Refactor usage-limit keys and exact values.
4. Make AI limits derive from the central usage configuration.
5. Add the shared public plan catalog and comparison data.
6. Update unit tests before changing UI.

### Phase 2: Pricing and Polar Mapping

1. Update USD and PHP prices.
2. Update yearly savings language and tests.
3. Create new Polar sandbox products.
4. Implement legacy product-ID resolution if production subscribers exist.
5. Verify checkout metadata still sets `business.id` as the customer external
   identity.

### Phase 3: Business Quota Model

1. Replace plan-wide business bundle limits with one Free business per owner.
2. Preserve legacy multi-Free businesses without automatic locking.
3. Update additional-business creation and downgrade flows.
4. Add DB-backed integration coverage for ownership and subscription isolation.

### Phase 4: Feature and Limit Enforcement

1. Make inquiry and quote exports available on Free.
2. Remove manual follow-up and core-record caps.
3. Apply the new AI, email, form, member, pricing, knowledge, field, and upload
   limits at existing server-side write boundaries.
4. Ensure every gate uses the effective business plan from the subscription
   service.
5. Add contextual upgrade messages without removing existing functionality.

### Phase 5: Pricing and Billing UI

1. Rebuild pricing cards and comparison rows from canonical data.
2. Update plan-selection and billing-management UI.
3. Update usage banners and contextual quota states.
4. Verify responsive behavior and accessibility against `DESIGN.md`.

### Phase 6: Documentation and Support

1. Update billing setup instructions and product IDs.
2. Rewrite the support plan summary and limit answers.
3. Regenerate support knowledge CSVs using the existing script.
4. Run targeted searches for stale pricing values and deleted feature claims.

### Phase 7: Verification and Rollout

1. Run all required automated checks.
2. Exercise Polar sandbox checkout and webhook flows for every paid plan and
   interval.
3. Verify existing subscribers and legacy Free businesses according to policy.
4. Deploy to preview and complete the manual acceptance checklist.
5. Update production Polar configuration only after preview verification.

## Test Plan

### Unit Tests

Update or add tests for:

- Plan identifiers and upgrade order.
- Every entitlement on all three plans.
- Every final usage limit.
- AI task weights and plan allowances.
- Business-scoped AI quota behavior.
- Price formatting in USD and PHP.
- Monthly and yearly prices.
- Two-month-free annual calculation.
- Catalog and comparison values matching canonical helpers.
- Minimum-plan selection for feature paywalls.

Primary existing suites include:

- `tests/unit/plan-access.test.ts`
- `tests/unit/billing-plans.test.ts`
- `tests/unit/ai-usage-limiter-plan-change.test.ts`
- billing query and subscription unit tests

### Integration Tests

Add DB-backed scenarios for:

1. A new owner can create one Free business.
2. The same owner cannot create a second active Free business.
3. The owner can create an additional business through a paid checkout path.
4. Pro access on business A does not unlock Pro on business B.
5. A separately subscribed business receives its own AI allowance.
6. A legacy owner with two Free businesses retains access but cannot create a
   third Free business.
7. Downgrading to Free requires resolving another active Free business.
8. Free owners can export their own inquiry and quote data.
9. Non-members cannot export another business's data.
10. Reaching an email limit still permits copying the public quote link.
11. Reaching an AI limit does not affect manual quote creation or editing.
12. Existing above-limit forms, pricing entries, and knowledge sources remain
    readable after downgrade.
13. Business allows five members and rejects the sixth.
14. Webhooks for new and grandfathered product IDs resolve to the correct plan.

### Component Tests

Keep component coverage focused on meaningful interactions:

- Monthly/yearly interval changes update both paid prices.
- The plan-selection sheet highlights Pro for Free owners and Business for Pro
  owners where appropriate.
- Limit banners show the correct fallback action.
- Free export controls are enabled.
- Business member-limit messaging counts the owner.

Avoid snapshots and tests that duplicate static comparison copy.

### End-to-End Tests

Update `tests/e2e/paywall.spec.ts` and related billing flows:

- Replace the two-Free-business expectation with one Free business.
- Confirm the Free owner can use the complete surviving inquiry-to-quote flow.
- Confirm a Free owner can export inquiries and quotes.
- Confirm Pro paywalls appear for email templates, custom branding, advanced
  analytics, multiple forms, and automatic follow-ups.
- Confirm Business paywalls appear for members and audit logs if available.
- Confirm Free quote pages show Requo branding and paid pages remove it.
- Confirm monthly and yearly checkout buttons target the correct Polar product.

### Required Commands

Run in this order after implementation:

```bash
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

Run the full e2e suite when business creation, downgrade, checkout, and webhook
journeys are all covered by the local environment:

```bash
npm run test:e2e
```

## Manual Acceptance Checklist

- Pricing page shows $9/$90 Pro and $24/$240 Business.
- PHP pricing shows PHP 499/PHP 4,990 and PHP 1,299/PHP 12,990.
- Annual copy says two months free.
- No duplicate AI quota rows are visible.
- No pricing claim references removed features.
- Free is described as a complete product, not a trial.
- A new owner can complete inquiry -> quote -> share/send -> follow-up ->
  accepted/rejected without paying.
- Free manual link sharing remains available after the email quota is reached.
- Existing records remain readable after every tested limit and downgrade.
- Pro has a clear solo-owner reason to buy.
- Business has a clear five-member reason to buy.
- One business's subscription never changes a sibling business's entitlements.
- Checkout, webhook, cancellation, grace-period, and plan-cache synchronization
  still pass through the subscription service.
- Public and in-app pricing values agree exactly.
- Support documentation agrees with application behavior.

## Rollback Strategy

The plan requires no database schema migration unless the final implementation
finds a surviving schema dependency that cannot be handled in code. Prefer a
code-only rollout.

Rollback order:

1. Keep legacy Polar product mappings active.
2. Revert new checkout product IDs to the previous products if checkout fails.
3. Revert entitlement and limit configuration together with the pricing UI;
   never roll back only the UI or only enforcement.
4. Do not delete usage events or subscription history.
5. Do not automatically relock legacy businesses during rollback.

## Success Metrics

Instrumentation work should remain lightweight. Use existing billing and usage
data where possible.

Review after the first meaningful cohort:

- Free activation: owner receives an inquiry and creates a quote.
- Core-loop completion: quote is shared or sent and receives a response.
- Free-to-Pro conversion trigger: AI limit, email limit, automatic follow-up,
  branding, forms, or analytics.
- Pro-to-Business conversion trigger: member invitation or audit access.
- Checkout completion by plan and interval.
- Upgrade prompt views versus completed upgrades.
- Limit-related support requests.
- Paid cancellation and downgrade reasons.
- Variable cost per active Free and paid business.

Do not introduce a new analytics platform solely for this rollout.

## Out of Scope

- Usage-based billing.
- Paid add-ons.
- Per-seat billing.
- Enterprise or custom plans.
- Account-wide bundles covering multiple businesses.
- Restoring deleted automations, jobs, invoices, general AI chat, or other
  removed features.
- API access pricing.
- Support SLAs.
- Schema redesign of subscriptions.
- Replacing Polar.

## AI Handoff Instructions

An implementing AI must:

1. Treat this document as the product decision source for pricing.
2. Treat current repository code as the technical source of truth when paths or
   removed features differ.
3. Stop and report a conflict if implementing a pricing promise would require
   restoring a feature intentionally deleted in the current worktree.
4. Preserve all unrelated user edits.
5. Use small, reviewable phases and verify each phase before continuing.
6. Never bypass `lib/billing/subscription-service.ts` for subscription writes.
7. Never edit a committed migration.
8. Avoid a schema migration unless it is demonstrably required.
9. Keep `app/` thin and place product logic in `features/` or `lib/`.
10. Report changed files, tests run, unresolved conflicts, and any production
    Polar action that still requires an operator.

Implementation is complete only when application behavior, paywalls, pricing
pages, checkout products, tests, and support documentation all describe the same
plans.
