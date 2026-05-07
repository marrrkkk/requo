/**
 * Central plan definitions for the Requo pricing system.
 *
 * Plans are attached to businesses (not users). This module is
 * the single source of truth for plan identifiers, labels, and metadata.
 */

export const businessPlans = ["free", "pro", "business"] as const;

export type BusinessPlan = (typeof businessPlans)[number];

export function isBusinessPlan(value: unknown): value is BusinessPlan {
  return (
    typeof value === "string" &&
    businessPlans.includes(value as BusinessPlan)
  );
}


export type PlanMeta = {
  label: string;
  description: string;
  ctaLabel: string;
  /** Whether this plan is the currently recommended upsell target. */
  highlighted: boolean;
};

export const planMeta: Record<BusinessPlan, PlanMeta> = {
  free: {
    label: "Free",
    description:
      "For solo owners running the core inquiry-to-quote workflow for one business.",
    ctaLabel: "Get started free",
    highlighted: false,
  },
  pro: {
    label: "Pro",
    description:
      "For operators who need advanced intake, exports, AI, and multiple businesses.",
    ctaLabel: "Upgrade to Pro",
    highlighted: true,
  },
  business: {
    label: "Business",
    description:
      "For teams that need member roles, shared access, and the highest limits.",
    ctaLabel: "Upgrade to Business",
    highlighted: false,
  },
};

/**
 * Returns the minimum plan that upgrades from the current plan.
 * Returns `null` if the business is already on the highest plan.
 */
export function getUpgradePlan(
  currentPlan: BusinessPlan,
): BusinessPlan | null {
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
export function getUpgradeCtaLabel(currentPlan: BusinessPlan): string {
  const upgradePlan = getUpgradePlan(currentPlan);

  if (!upgradePlan) {
    return "You're on the highest plan";
  }

  return planMeta[upgradePlan].ctaLabel;
}
