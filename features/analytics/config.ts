/**
 * Analytics section metadata.
 *
 * The `tier` annotation is informational only — it documents the intended
 * future pricing segmentation so that gating can be added later without
 * restructuring the analytics system.
 *
 * Tiers:
 *   basic    — available on all plans
 *   pro      — available on pro+ plans
 *   business — available on business plan only
 */

export const analyticsSections = {
  overview: {
    id: "overview",
    label: "Overview",
    description: "Traffic, submissions, quotes, and timing in one view.",
    tier: "basic",
  },
  conversion: {
    id: "conversion",
    label: "Inquiry/Form Performance",
    description: "Form traffic, submissions, and inquiry-to-quote conversion.",
    tier: "pro",
  },
  workflow: {
    id: "workflow",
    label: "Quote Performance",
    description: "Quote outcomes, lifecycle mix, and turnaround timing.",
    tier: "pro",
  },
} as const;

export type AnalyticsSectionId = keyof typeof analyticsSections;

export type AnalyticsTier = (typeof analyticsSections)[AnalyticsSectionId]["tier"];
