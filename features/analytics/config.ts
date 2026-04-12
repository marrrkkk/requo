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
    description: "Core business health metrics at a glance.",
    tier: "basic",
  },
  conversion: {
    id: "conversion",
    label: "Conversion",
    description: "Inquiry-to-quote and quote-to-acceptance funnel.",
    tier: "pro",
  },
  workflow: {
    id: "workflow",
    label: "Workflow",
    description: "Response times, stale items, and follow-up gaps.",
    tier: "pro",
  },
} as const;

export type AnalyticsSectionId = keyof typeof analyticsSections;

export type AnalyticsTier = (typeof analyticsSections)[AnalyticsSectionId]["tier"];
