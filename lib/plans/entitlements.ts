/**
 * Central feature entitlements for the Requo pricing system.
 *
 * Each feature that varies by plan is declared here. Access checks go through
 * `hasFeatureAccess` and `getRequiredPlan`; feature code should not use raw
 * plan comparisons.
 *
 * Entitlements are evaluated at the business level.
 */

import type { BusinessPlan } from "@/lib/plans/plans";

export const planFeatures = [
  "analyticsConversion",
  "analyticsWorkflow",
  "multipleForms",
  "inquiryPageCustomization",
  "attachments",
  "emailTemplates",
  "customerHistory",
  "pushNotifications",
  "quoteLibrary",
  "knowledgeBase",
  "aiAssistant",
  "members",
  "exports",
  "branding",
  "multiBusiness",
  "followUps",
] as const;

export type PlanFeature = (typeof planFeatures)[number];

const planEntitlements: Record<BusinessPlan, ReadonlySet<PlanFeature>> = {
  free: new Set<PlanFeature>([
    "analyticsConversion",
    "attachments",
    "customerHistory",
    "followUps",
    "pushNotifications",
  ]),
  pro: new Set<PlanFeature>([
    "analyticsConversion",
    "analyticsWorkflow",
    "multipleForms",
    "inquiryPageCustomization",
    "attachments",
    "emailTemplates",
    "customerHistory",
    "pushNotifications",
    "quoteLibrary",
    "knowledgeBase",
    "aiAssistant",
    "exports",
    "branding",
    "multiBusiness",
    "followUps",
  ]),
  business: new Set<PlanFeature>([
    "analyticsConversion",
    "analyticsWorkflow",
    "multipleForms",
    "inquiryPageCustomization",
    "attachments",
    "emailTemplates",
    "customerHistory",
    "pushNotifications",
    "quoteLibrary",
    "knowledgeBase",
    "aiAssistant",
    "members",
    "exports",
    "branding",
    "multiBusiness",
    "followUps",
  ]),
};

/**
 * Checks whether a business plan grants access to a given feature.
 */
export function hasFeatureAccess(
  plan: BusinessPlan,
  feature: PlanFeature,
): boolean {
  return planEntitlements[plan].has(feature);
}

/**
 * Returns the minimum plan required to unlock a feature, or `null` if the
 * feature is available on all plans.
 */
export function getRequiredPlan(feature: PlanFeature): BusinessPlan | null {
  if (planEntitlements.free.has(feature)) {
    return null;
  }

  if (planEntitlements.pro.has(feature)) {
    return "pro";
  }

  if (planEntitlements.business.has(feature)) {
    return "business";
  }

  return "business";
}

/** Human-readable label for a feature, used in paywall UI. */
export const planFeatureLabels: Record<PlanFeature, string> = {
  analyticsConversion: "Conversion analytics",
  analyticsWorkflow: "Workflow analytics",
  multipleForms: "Multiple inquiry forms",
  inquiryPageCustomization: "Inquiry page customization",
  attachments: "File attachments",
  emailTemplates: "Email templates",
  customerHistory: "Customer history",
  pushNotifications: "Push notifications",
  quoteLibrary: "Quote library",
  knowledgeBase: "Knowledge",
  aiAssistant: "AI assistant",
  members: "Team members",
  exports: "Data exports",
  branding: "Advanced branding",
  multiBusiness: "Multiple businesses",
  followUps: "Follow-ups",
};

/** Short value description for use in paywall locked states. */
export const planFeatureDescriptions: Record<PlanFeature, string> = {
  analyticsConversion:
    "See how inquiries convert to quotes and acceptances.",
  analyticsWorkflow:
    "Track response times, stale items, and follow-up gaps.",
  multipleForms:
    "Create additional inquiry forms for different services or audiences.",
  inquiryPageCustomization:
    "Customize your public inquiry page layout, showcase image, and supporting cards.",
  attachments:
    "Let customers attach files to their inquiries, with higher limits on paid plans.",
  emailTemplates:
    "Customize the email message used when sending quotes through Requo.",
  customerHistory:
    "Review a customer's prior inquiries and quotes from inquiry and quote detail pages.",
  pushNotifications:
    "Receive browser push notifications for important inquiry and quote events.",
  quoteLibrary:
    "Build a library of reusable quote templates.",
  knowledgeBase:
    "Manage FAQs and knowledge files for your AI assistant.",
  aiAssistant:
    "Get AI-drafted replies and suggestions for inquiries.",
  members:
    "Invite team members and assign roles.",
  exports:
    "Export inquiries, quotes, and audit logs.",
  branding:
    "Remove Requo branding and unlock advanced brand controls.",
  multiBusiness:
    "Manage more than one total business across your businesses.",
  followUps:
    "Create follow-up reminders to stay on top of inquiries and quotes.",
};
