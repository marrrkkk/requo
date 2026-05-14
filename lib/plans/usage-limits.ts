/**
 * Central usage-limit definitions for the Requo pricing system.
 *
 * Limits are defined per business plan. A `null` limit means unlimited.
 * Usage enforcement uses the helpers in `./usage.ts`.
 *
 * Usage is counted at the business scope except business creation, which is
 * capped globally across businesses owned by the account.
 */

import type { BusinessPlan } from "@/lib/plans/plans";

export const usageLimitKeys = [
  "inquiriesPerMonth",
  "quotesPerMonth",
  "aiLineItemGenerationsPerMonth",
  "requoQuoteEmailsPerDay",
  "requoQuoteEmailsPerMonth",
  "businessesPerWorkspace",
  "membersPerWorkspace",
  "liveFormsPerWorkspace",
  "businessesPerPlan",
  "membersPerBusiness",
  "liveFormsPerBusiness",
  "memoriesPerBusiness",
  "pricingEntriesPerBusiness",
  "customFieldsPerForm",
  "activeFollowUps",
  "publicInquiryAttachmentMaxBytes",
] as const;

export type UsageLimitKey = (typeof usageLimitKeys)[number];

type PlanUsageLimits = Record<UsageLimitKey, number | null>;

const planUsageLimits: Record<BusinessPlan, PlanUsageLimits> = {
  free: {
    inquiriesPerMonth: null,
    quotesPerMonth: 30,
    aiLineItemGenerationsPerMonth: 10,
    requoQuoteEmailsPerDay: 3,
    requoQuoteEmailsPerMonth: 15,
    businessesPerWorkspace: 1,
    membersPerWorkspace: 1,
    liveFormsPerWorkspace: 1,
    businessesPerPlan: 1,
    membersPerBusiness: 1,
    liveFormsPerBusiness: 1,
    memoriesPerBusiness: 0,
    pricingEntriesPerBusiness: 0,
    customFieldsPerForm: 3,
    activeFollowUps: 3,
    publicInquiryAttachmentMaxBytes: 5 * 1024 * 1024,
  },
  pro: {
    inquiriesPerMonth: null,
    quotesPerMonth: null,
    aiLineItemGenerationsPerMonth: 100,
    requoQuoteEmailsPerDay: 20,
    requoQuoteEmailsPerMonth: 200,
    businessesPerWorkspace: 5,
    membersPerWorkspace: 1,
    liveFormsPerWorkspace: 5,
    businessesPerPlan: 5,
    membersPerBusiness: 1,
    liveFormsPerBusiness: 5,
    memoriesPerBusiness: 10,
    pricingEntriesPerBusiness: 20,
    customFieldsPerForm: 10,
    activeFollowUps: null,
    publicInquiryAttachmentMaxBytes: 25 * 1024 * 1024,
  },
  business: {
    inquiriesPerMonth: null,
    quotesPerMonth: null,
    aiLineItemGenerationsPerMonth: 500,
    requoQuoteEmailsPerDay: 50,
    requoQuoteEmailsPerMonth: 500,
    businessesPerWorkspace: null,
    membersPerWorkspace: 25,
    liveFormsPerWorkspace: null,
    businessesPerPlan: null,
    membersPerBusiness: 25,
    liveFormsPerBusiness: null,
    memoriesPerBusiness: 50,
    pricingEntriesPerBusiness: null,
    customFieldsPerForm: 24,
    activeFollowUps: null,
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
  inquiriesPerMonth: "Inquiries per month",
  quotesPerMonth: "Quotes per month",
  aiLineItemGenerationsPerMonth: "AI line item generations per month",
  requoQuoteEmailsPerDay: "Requo quote sends per day",
  requoQuoteEmailsPerMonth: "Requo quote sends per month",
  businessesPerWorkspace: "Businesses across businesses",
  membersPerWorkspace: "Members per business",
  liveFormsPerWorkspace: "Live inquiry forms",
  businessesPerPlan: "Businesses per plan",
  membersPerBusiness: "Members per business",
  liveFormsPerBusiness: "Live inquiry forms",
  memoriesPerBusiness: "Knowledge items per business",
  pricingEntriesPerBusiness: "Pricing entries per business",
  customFieldsPerForm: "Custom fields per form",
  activeFollowUps: "Active follow-ups",
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
