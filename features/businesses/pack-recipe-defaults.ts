import type { BehaviorPackKey } from "@/features/businesses/behavior-packs";
import type { ScopeBlockKind } from "@/lib/db/schema/scope-blocks";

/**
 * Code defaults for versioned pack recipes (verticalization F-02).
 *
 * These are seed data only: per-business recipe rows are copied from here at
 * onboarding/seed time and then version forward independently. Editing this
 * file never rewrites existing businesses — new versions propagate only via
 * explicit reset/switch flows.
 */

export type IntakeCriticality = "critical" | "normal" | "optional";

export type IntakeBindingBehavior =
  | "readiness"
  | "approval_requirement"
  | "quote_behavior"
  | "schedule_behavior"
  | "follow_up_behavior";

export const intakeBindingBehaviors: readonly IntakeBindingBehavior[] = [
  "readiness",
  "approval_requirement",
  "quote_behavior",
  "schedule_behavior",
  "follow_up_behavior",
];

export type IntakeRecipeConfig = {
  version: 1;
  /** Labels matched (case-insensitive, trimmed) against submitted fields. */
  criticalFields: Array<{
    label: string;
    criticality: IntakeCriticality;
    behaviors: IntakeBindingBehavior[];
  }>;
};

export type ScopeRecipeConfig = {
  version: 1;
  requiredKinds: ScopeBlockKind[];
  recommendedKinds: ScopeBlockKind[];
};

export type ApprovalSubjectRecipe = {
  enabled: boolean;
  expiryDays: number;
  reminderEveryDays: number;
  attestationRequired: boolean;
};

export type ApprovalRecipeConfig = {
  version: 1;
  recipes: Record<string, ApprovalSubjectRecipe>;
};

export type ScheduleRecipeConfig = {
  version: 1;
  structures: Array<{
    label: string;
    splits: Array<{ category: string; percentBps: number }>;
  }>;
};

export type AiGuidanceRecipeConfig = {
  version: 1;
  terminology: string[];
  scopeRules: string[];
  completeness: string[];
  packageConcepts: string[];
  missingInfoGuidance: string[];
  /** Inquiry labels treated as critical missing information. */
  criticalLabels: string[];
};

function intake(
  criticalFields: IntakeRecipeConfig["criticalFields"],
): IntakeRecipeConfig {
  return { version: 1, criticalFields };
}

const scope = (
  requiredKinds: ScopeBlockKind[],
  recommendedKinds: ScopeBlockKind[],
): ScopeRecipeConfig => ({ version: 1, requiredKinds, recommendedKinds });

const baseApprovalRecipes: ApprovalRecipeConfig["recipes"] = {
  proof: { enabled: true, expiryDays: 7, reminderEveryDays: 2, attestationRequired: true },
  final_count: { enabled: true, expiryDays: 7, reminderEveryDays: 2, attestationRequired: true },
  asset: { enabled: true, expiryDays: 7, reminderEveryDays: 3, attestationRequired: true },
  hold_confirmation: { enabled: true, expiryDays: 3, reminderEveryDays: 1, attestationRequired: false },
  // Milestone approvals unlock after P5 schedules land (dependency graph §B31).
  milestone: { enabled: false, expiryDays: 7, reminderEveryDays: 2, attestationRequired: true },
};

const schedule = (
  structures: ScheduleRecipeConfig["structures"],
): ScheduleRecipeConfig => ({ version: 1, structures });

export const packRecipeDefaults: Record<
  BehaviorPackKey,
  {
    intake: IntakeRecipeConfig;
    scope: ScopeRecipeConfig;
    approval: ApprovalRecipeConfig;
    schedule: ScheduleRecipeConfig;
    ai_guidance: AiGuidanceRecipeConfig;
  }
> = {
  contractors_home_services: {
    intake: intake([
      { label: "Project details", criticality: "critical", behaviors: ["readiness"] },
      { label: "Service location", criticality: "critical", behaviors: ["readiness"] },
      { label: "Photos or plans", criticality: "normal", behaviors: ["readiness", "approval_requirement"] },
      { label: "Preferred visit or start date", criticality: "normal", behaviors: ["readiness", "follow_up_behavior"] },
      { label: "Access notes", criticality: "optional", behaviors: [] },
    ]),
    scope: scope(
      ["exclusions", "allowances", "assumptions"],
      ["deliverables", "timeline", "payment_schedule"],
    ),
    approval: { version: 1, recipes: { ...baseApprovalRecipes } },
    schedule: schedule([
      { label: "Deposit + progress", splits: [{ category: "deposit", percentBps: 3000 }, { category: "milestone", percentBps: 4000 }, { category: "balance", percentBps: 3000 }] },
      { label: "Deposit + balance", splits: [{ category: "deposit", percentBps: 5000 }, { category: "balance", percentBps: 5000 }] },
    ]),
    ai_guidance: {
      version: 1,
      terminology: ["site", "scope of work", "allowance", "change order"],
      scopeRules: ["Everything outside the written scope is a change order, never a favor.", "Allowances name a brand or grade; unbranded allowances invite disputes."],
      completeness: ["Site readiness (access, power, water, parking) must be confirmed before work is scheduled."],
      packageConcepts: ["Good/Better/Best tiers stay Phase 2; quote one clear scope plus allowances."],
      missingInfoGuidance: ["Ask for site photos and measurements before pricing on-site work."],
      criticalLabels: ["Project details", "Service location"],
    },
  },
  creative_marketing: {
    intake: intake([
      { label: "Project brief", criticality: "critical", behaviors: ["readiness"] },
      { label: "Where this will be used", criticality: "normal", behaviors: ["readiness", "quote_behavior"] },
      { label: "Target date", criticality: "normal", behaviors: ["readiness", "follow_up_behavior"] },
      { label: "Reference files", criticality: "optional", behaviors: ["approval_requirement"] },
    ]),
    scope: scope(
      ["deliverables", "revision_cap", "usage_rights"],
      ["exclusions", "acceptance_criteria", "timeline"],
    ),
    approval: { version: 1, recipes: { ...baseApprovalRecipes } },
    schedule: schedule([
      { label: "Split retainer", splits: [{ category: "retainer", percentBps: 5000 }, { category: "balance", percentBps: 5000 }] },
      { label: "Three-part", splits: [{ category: "deposit", percentBps: 3400 }, { category: "milestone", percentBps: 3300 }, { category: "balance", percentBps: 3300 }] },
    ]),
    ai_guidance: {
      version: 1,
      terminology: ["deliverable", "revision round", "usage rights", "sign-off"],
      scopeRules: ["Each deliverable names its format and count; rounds beyond the cap are billed.", "Feedback must be consolidated: one voice, one round."],
      completeness: ["Usage media, term, and territory must be explicit before final files ship."],
      packageConcepts: ["Scope concepts, not headcount; never promise unlimited revisions."],
      missingInfoGuidance: ["Ask where the work will be used and how many revision rounds the client expects."],
      criticalLabels: ["Project brief"],
    },
  },
  professional_it: {
    intake: intake([
      { label: "Challenge or goal", criticality: "critical", behaviors: ["readiness"] },
      { label: "Desired start date", criticality: "normal", behaviors: ["readiness", "follow_up_behavior"] },
      { label: "Participant count", criticality: "optional", behaviors: ["quote_behavior"] },
    ]),
    scope: scope(
      ["deliverables", "assumptions", "acceptance_criteria"],
      ["exclusions", "timeline", "payment_schedule", "client_responsibilities"],
    ),
    approval: { version: 1, recipes: { ...baseApprovalRecipes } },
    schedule: schedule([
      { label: "Milestone-weighted", splits: [{ category: "deposit", percentBps: 2500 }, { category: "milestone", percentBps: 5000 }, { category: "balance", percentBps: 2500 }] },
    ]),
    ai_guidance: {
      version: 1,
      terminology: ["statement of work", "acceptance criteria", "assumption", "out of scope"],
      scopeRules: ["Assumptions about client systems and access are part of the scope, not footnotes.", "Impact-assessed changes go through change orders."],
      completeness: ["Acceptance criteria name a reviewer and a response window."],
      packageConcepts: ["Price the engagement, not the hours, unless time-and-materials is explicit."],
      missingInfoGuidance: ["Ask what systems the work touches and who signs acceptance."],
      criticalLabels: ["Challenge or goal"],
    },
  },
  photo_video: {
    intake: intake([
      { label: "Event details", criticality: "critical", behaviors: ["readiness"] },
      { label: "Event or shoot date", criticality: "critical", behaviors: ["readiness", "follow_up_behavior"] },
      { label: "Venue or location", criticality: "critical", behaviors: ["readiness"] },
      { label: "Duration", criticality: "normal", behaviors: ["readiness", "quote_behavior"] },
    ]),
    scope: scope(
      ["deliverables", "usage_rights"],
      ["exclusions", "timeline", "payment_schedule", "acceptance_criteria"],
    ),
    approval: { version: 1, recipes: { ...baseApprovalRecipes } },
    schedule: schedule([
      { label: "Retainer + balance", splits: [{ category: "retainer", percentBps: 3000 }, { category: "balance", percentBps: 7000 }] },
    ]),
    ai_guidance: {
      version: 1,
      terminology: ["coverage", "deliverable", "usage rights", "date hold"],
      scopeRules: ["Coverage hours, shooter count, and deliverable formats are explicit.", "Date holds expire; they never imply availability."],
      completeness: ["Date, venue, start time, and coverage hours must be confirmed before quoting."],
      packageConcepts: ["Package by coverage and deliverables, never by inventory."],
      missingInfoGuidance: ["Ask for the shoot date, venue, hours of coverage, and final deliverables."],
      criticalLabels: ["Event or shoot date", "Venue or location", "Duration"],
    },
  },
  events_rentals: {
    intake: intake([
      { label: "Event details", criticality: "critical", behaviors: ["readiness"] },
      { label: "Event or shoot date", criticality: "critical", behaviors: ["readiness", "follow_up_behavior"] },
      { label: "Venue or location", criticality: "critical", behaviors: ["readiness"] },
      { label: "Guest or attendee count", criticality: "normal", behaviors: ["readiness", "quote_behavior"] },
    ]),
    scope: scope(
      ["deliverables", "client_responsibilities", "assumptions"],
      ["exclusions", "timeline", "payment_schedule"],
    ),
    approval: { version: 1, recipes: { ...baseApprovalRecipes } },
    schedule: schedule([
      { label: "Retainer + balance", splits: [{ category: "retainer", percentBps: 5000 }, { category: "balance", percentBps: 5000 }] },
    ]),
    ai_guidance: {
      version: 1,
      terminology: ["headcount", "final count", "date hold", "load-in"],
      scopeRules: ["Guest count drives readiness and final-count approval — never inventory or kitting.", "Client responsibilities (venue access, power, load-in) are written down."],
      completeness: ["Date, venue, and guest count must be confirmed; recounts create new approval versions."],
      packageConcepts: ["Packages stay Phase 2; quote the event as scoped services."],
      missingInfoGuidance: ["Ask for date, venue, guest count, and load-in constraints."],
      criticalLabels: ["Event or shoot date", "Venue or location", "Guest or attendee count"],
    },
  },
  fabrication_signage: {
    intake: intake([
      { label: "Project details", criticality: "critical", behaviors: ["readiness"] },
      { label: "Dimensions", criticality: "critical", behaviors: ["readiness"] },
      { label: "Material", criticality: "critical", behaviors: ["readiness"] },
      { label: "Finish", criticality: "normal", behaviors: ["readiness", "approval_requirement"] },
      { label: "Reference files", criticality: "normal", behaviors: ["approval_requirement"] },
    ]),
    scope: scope(
      ["deliverables", "assumptions", "acceptance_criteria"],
      ["exclusions", "allowances", "timeline", "payment_schedule"],
    ),
    approval: { version: 1, recipes: { ...baseApprovalRecipes } },
    schedule: schedule([
      { label: "Deposit + balance", splits: [{ category: "deposit", percentBps: 5000 }, { category: "balance", percentBps: 5000 }] },
    ]),
    ai_guidance: {
      version: 1,
      terminology: ["spec lock", "substrate", "finish", "proof", "production-ready"],
      scopeRules: ["Dimensions, substrate, and finish lock before production; spec changes are change orders.", "Proof approval is version-locked: a new file is a new version."],
      completeness: ["No production without an approved proof at the final spec."],
      packageConcepts: ["Price the build, not the machine time."],
      missingInfoGuidance: ["Ask for dimensions, substrate/material, finish, quantity, and install location."],
      criticalLabels: ["Dimensions", "Material", "Project details"],
    },
  },
};
