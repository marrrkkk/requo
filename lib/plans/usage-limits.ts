/**
 * Central usage-limit definitions for the Requo pricing system.
 *
 * Limits are defined per business plan. A `null` limit means unlimited.
 * Usage enforcement uses the helpers in `./usage.ts`.
 *
 * Usage is counted at the business scope. Core records (inquiries, quotes,
 * customers, accepted quotes) and manual follow-ups are intentionally not
 * capped. The only account-scoped limit is `freeBusinessesPerOwner`, which
 * is enforced by `features/businesses/quota.ts`.
 */

import type { BusinessPlan } from "@/lib/plans/plans";

export const usageLimitKeys = [
  "aiWeightedCreditsPerMonth",
  "requoQuoteEmailsPerDay",
  "requoQuoteEmailsPerMonth",
  "freeBusinessesPerOwner",
  "membersPerBusiness",
  "liveFormsPerBusiness",
  "productEntriesPerBusiness",
  "knowledgeSourcesPerBusiness",
  "customFieldsPerForm",
  "publicInquiryAttachmentMaxBytes",
] as const;

export type UsageLimitKey = (typeof usageLimitKeys)[number];

type PlanUsageLimits = Record<UsageLimitKey, number | null>;

const planUsageLimits: Record<BusinessPlan, PlanUsageLimits> = {
  free: {
    aiWeightedCreditsPerMonth: 30,
    requoQuoteEmailsPerDay: 3,
    requoQuoteEmailsPerMonth: 15,
    freeBusinessesPerOwner: 1,
    membersPerBusiness: 1,
    liveFormsPerBusiness: 1,
    productEntriesPerBusiness: 10,
    knowledgeSourcesPerBusiness: 5,
    customFieldsPerForm: 3,
    publicInquiryAttachmentMaxBytes: 5 * 1024 * 1024,
  },
  pro: {
    aiWeightedCreditsPerMonth: 150,
    requoQuoteEmailsPerDay: 20,
    requoQuoteEmailsPerMonth: 200,
    freeBusinessesPerOwner: null,
    membersPerBusiness: 1,
    liveFormsPerBusiness: 5,
    productEntriesPerBusiness: 50,
    knowledgeSourcesPerBusiness: 25,
    customFieldsPerForm: 10,
    publicInquiryAttachmentMaxBytes: 25 * 1024 * 1024,
  },
  business: {
    aiWeightedCreditsPerMonth: 500,
    requoQuoteEmailsPerDay: 50,
    requoQuoteEmailsPerMonth: 500,
    freeBusinessesPerOwner: null,
    membersPerBusiness: 5,
    liveFormsPerBusiness: 10,
    productEntriesPerBusiness: null,
    knowledgeSourcesPerBusiness: 50,
    customFieldsPerForm: 24,
    publicInquiryAttachmentMaxBytes: 50 * 1024 * 1024,
  },
};

/**
 * Returns the usage limit for a plan and key, or `null` if unlimited.
 */
export function getUsageLimit(
  plan: BusinessPlan,
  key: UsageLimitKey,
): number | null {
  return planUsageLimits[plan][key];
}

/**
 * Returns `true` if the plan has a finite limit for the given key.
 */
export function isUsageLimited(
  plan: BusinessPlan,
  key: UsageLimitKey,
): boolean {
  return planUsageLimits[plan][key] !== null;
}

/** Human-readable labels for usage limit keys. */
export const usageLimitLabels: Record<UsageLimitKey, string> = {
  aiWeightedCreditsPerMonth: "Weighted AI credits per month",
  requoQuoteEmailsPerDay: "Requo quote sends per day",
  requoQuoteEmailsPerMonth: "Requo quote sends per month",
  freeBusinessesPerOwner: "Free businesses per owner",
  membersPerBusiness: "Members per business",
  liveFormsPerBusiness: "Live inquiry forms",
  productEntriesPerBusiness: "Product entries per business",
  knowledgeSourcesPerBusiness: "Knowledge sources per business",
  customFieldsPerForm: "Custom fields per form",
  publicInquiryAttachmentMaxBytes: "Public inquiry upload size",
};

export function formatUsageLimitValue(
  key: UsageLimitKey,
  value: number | null,
): string {
  if (value === null) {
    return "Unlimited";
  }

  if (key === "publicInquiryAttachmentMaxBytes") {
    const megabytes = value / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  return `${value}`;
}
