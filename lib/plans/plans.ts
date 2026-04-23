/**
 * Central plan definitions for the Requo pricing system.
 *
 * Plans are attached to workspaces (not businesses or users). Plan changes are
 * currently made manually in the database. This module is the single source of
 * truth for plan identifiers, labels, and metadata.
 */

export const workspacePlans = ["free", "pro", "business"] as const;

export type WorkspacePlan = (typeof workspacePlans)[number];

/** @deprecated Use `WorkspacePlan` instead. */
export type BusinessPlan = WorkspacePlan;

/** @deprecated Use `workspacePlans` instead. */
export const businessPlans = workspacePlans;

export function isWorkspacePlan(value: unknown): value is WorkspacePlan {
  return (
    typeof value === "string" &&
    workspacePlans.includes(value as WorkspacePlan)
  );
}

/** @deprecated Use `isWorkspacePlan` instead. */
export const isBusinessPlan = isWorkspacePlan;

export type PlanMeta = {
  label: string;
  description: string;
  ctaLabel: string;
  /** Whether this plan is the currently recommended upsell target. */
  highlighted: boolean;
};

export const planMeta: Record<WorkspacePlan, PlanMeta> = {
  free: {
    label: "Free",
    description: "For solo owners getting organized — one workspace, one business.",
    ctaLabel: "Get started free",
    highlighted: false,
  },
  pro: {
    label: "Pro",
    description: "For operators who need premium tools and multiple businesses in one workspace.",
    ctaLabel: "Upgrade to Pro",
    highlighted: true,
  },
  business: {
    label: "Business",
    description: "For teams that need collaboration, roles, and the highest limits.",
    ctaLabel: "Upgrade to Business",
    highlighted: false,
  },
};

/**
 * Returns the minimum plan that upgrades from the current plan.
 * Returns `null` if the workspace is already on the highest plan.
 */
export function getUpgradePlan(
  currentPlan: WorkspacePlan,
): WorkspacePlan | null {
  switch (currentPlan) {
    case "free":
      return "pro";
    case "pro":
      return "business";
    case "business":
      return null;
  }
}

/**
 * Returns the CTA label for upgrading from a given plan.
 */
export function getUpgradeCtaLabel(currentPlan: WorkspacePlan): string {
  const upgradePlan = getUpgradePlan(currentPlan);

  if (!upgradePlan) {
    return "You're on the highest plan";
  }

  return planMeta[upgradePlan].ctaLabel;
}
