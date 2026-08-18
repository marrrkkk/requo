/**
 * Starter workflow definitions for onboarding.
 *
 * Workflows define the initial inquiry-form field pattern.
 * BusinessType describes what kind of service business this is.
 * These are separate concerns and both are used during onboarding.
 */

import type { BusinessType } from "@/features/inquiries/business-types";

export const starterWorkflowKeys = [
  "project_quote",
  "recurring_service",
  "consultation_proposal",
] as const;

export type StarterWorkflowKey = (typeof starterWorkflowKeys)[number];

export type StarterWorkflowDefinition = {
  key: StarterWorkflowKey;
  label: string;
  description: string;
  formFieldsSummary: string;
};

export const starterWorkflowDefinitions: Record<
  StarterWorkflowKey,
  StarterWorkflowDefinition
> = {
  project_quote: {
    key: "project_quote",
    label: "Project quote",
    description: "Collect scope, timing, budget, and files for a custom job.",
    formFieldsSummary:
      "General custom-project questions suitable for creative, contractor, fabrication, web, print, and mixed project work.",
  },
  recurring_service: {
    key: "recurring_service",
    label: "Recurring service",
    description: "Collect location, frequency, timing, and service details.",
    formFieldsSummary:
      "Location, property details, frequency, and scheduling fields for recurring service work.",
  },
  consultation_proposal: {
    key: "consultation_proposal",
    label: "Consultation to proposal",
    description:
      "Qualify the goal and engagement before preparing a proposal.",
    formFieldsSummary:
      "Discovery-focused fields for goal, format, timing, and background before scoping a proposal.",
  },
};

/**
 * Maps BusinessType to a recommended starter workflow.
 *
 * This is used during onboarding to preselect a workflow choice
 * based on the owner's selected service category.
 */
export function getRecommendedStarterWorkflow(
  businessType: BusinessType,
): StarterWorkflowKey {
  // Recurring service workflow matches
  if (
    businessType === "cleaning_services" ||
    businessType === "landscaping_outdoor_services" ||
    businessType === "pet_services"
  ) {
    return "recurring_service";
  }

  // Consultation workflow matches
  if (businessType === "consulting_professional_services") {
    return "consultation_proposal";
  }

  // Project quote is the default for all other business types
  return "project_quote";
}
