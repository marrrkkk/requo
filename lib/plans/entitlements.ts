/**
 * Central feature entitlements for the Requo pricing system.
 *
 * Each feature that varies by plan is declared here. Access checks go through
 * `hasFeatureAccess` and `getRequiredPlan` — never raw `plan === "pro"` checks
 * in feature code.
 *
 * Entitlements are evaluated at the workspace level. Businesses inherit
 * feature access from their workspace's plan.
 */

import type { WorkspacePlan } from "@/lib/plans/plans";

export const planFeatures = [
  "analyticsConversion",
  "analyticsWorkflow",
  "multipleForms",
  "inquiryPageCustomization",
  "attachments",
  "replySnippets",
  "quoteLibrary",
  "knowledgeBase",
  "aiAssistant",
  "members",
  "exports",
  "branding",
  "multiBusiness",
] as const;

export type PlanFeature = (typeof planFeatures)[number];

const planEntitlements: Record<WorkspacePlan, ReadonlySet<PlanFeature>> = {
  free: new Set<PlanFeature>([]),
  pro: new Set<PlanFeature>([
    "analyticsConversion",
    "analyticsWorkflow",
    "multipleForms",
    "inquiryPageCustomization",
    "attachments",
    "replySnippets",
    "quoteLibrary",
    "knowledgeBase",
    "aiAssistant",
    "exports",
    "branding",
    "multiBusiness",
  ]),
  business: new Set<PlanFeature>([
    "analyticsConversion",
    "analyticsWorkflow",
    "multipleForms",
    "inquiryPageCustomization",
    "attachments",
    "replySnippets",
    "quoteLibrary",
    "knowledgeBase",
    "aiAssistant",
    "members",
    "exports",
    "branding",
    "multiBusiness",
  ]),
};

/**
 * Checks whether a workspace plan grants access to a given feature.
 */
export function hasFeatureAccess(
  plan: WorkspacePlan,
  feature: PlanFeature,
): boolean {
  return planEntitlements[plan].has(feature);
}

/**
 * Returns the minimum plan required to unlock a feature, or `null` if the
 * feature is available on all plans.
 */
export function getRequiredPlan(feature: PlanFeature): WorkspacePlan | null {
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
  replySnippets: "Saved replies",
  quoteLibrary: "Quote library",
  knowledgeBase: "Knowledge",
  aiAssistant: "AI assistant",
  members: "Team members",
  exports: "Data exports",
  branding: "Custom branding",
  multiBusiness: "Multiple businesses",
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
    "Customize your public inquiry page layout, branding, and fields.",
  attachments:
    "Let customers attach files to their inquiries.",
  replySnippets:
    "Save and reuse common responses to speed up replies.",
  quoteLibrary:
    "Build a library of reusable quote templates.",
  knowledgeBase:
    "Manage FAQs and knowledge files for your AI assistant.",
  aiAssistant:
    "Get AI-drafted replies and suggestions for inquiries.",
  members:
    "Invite team members and assign roles.",
  exports:
    "Export inquiries and quotes as CSV or PDF.",
  branding:
    "Add your logo and brand to quotes and inquiry pages.",
  multiBusiness:
    "Manage more than one business in this workspace.",
};
