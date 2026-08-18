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

export type PlanFeature = (typeof planFeatures)[number];

const planEntitlements: Record<BusinessPlan, ReadonlySet<PlanFeature>> = {
  free: new Set<PlanFeature>([
    "followUps",
    "aiQuoteDrafting",
    "quoteLibrary",
    "knowledgeBase",
    "exports",
  ]),
  pro: new Set<PlanFeature>([
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
  ]),
  business: new Set<PlanFeature>([
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
  analyticsConversion: "Performance analytics",
  analyticsWorkflow: "Operations analytics",
  multipleForms: "Multiple inquiry forms",
  inquiryPageCustomization: "Inquiry page customization",
  emailTemplates: "Email templates",
  aiQuoteDrafting: "AI quote drafting",
  quoteLibrary: "Quote library",
  knowledgeBase: "Knowledge base",
  exports: "Data exports",
  removeWatermark: "Remove Requo watermark",
  followUps: "Follow-ups",
  autoFollowUps: "Auto follow-ups",
  members: "Team members",
  auditLogs: "Audit logs",
};

/** Short value description for use in paywall locked states. */
export const planFeatureDescriptions: Record<PlanFeature, string> = {
  analyticsConversion:
    "Trend charts, funnel visualization, form-level breakdown, and period comparisons.",
  analyticsWorkflow:
    "Workflow timing, operational alerts, revenue tracking, and follow-up analytics.",
  multipleForms:
    "Create additional inquiry forms for different services or audiences.",
  inquiryPageCustomization:
    "Customize your public inquiry page layout, showcase image, and supporting cards.",
  emailTemplates:
    "Customize the email message used when sending quotes through Requo.",
  aiQuoteDrafting:
    "Get AI-generated quote drafts and improvements for your inquiries.",
  quoteLibrary:
    "Build a library of reusable pricing entries and quote templates.",
  knowledgeBase:
    "Save business knowledge and files so AI quote drafts stay grounded in how you work.",
  exports:
    "Export inquiries and quotes as CSV from your dashboard.",
  removeWatermark:
    "Remove the Requo watermark from public inquiry and quote pages.",
  followUps:
    "Create follow-up reminders to stay on top of inquiries and quotes.",
  autoFollowUps:
    "Automatically send follow-up emails when customers haven't responded to a quote.",
  members:
    "Invite team members and assign roles.",
  auditLogs:
    "Review meaningful admin, lifecycle, and security actions for this business.",
};