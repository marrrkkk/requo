/**
 * Central plan definitions for the Requo pricing system.
 *
 * Plans are attached to businesses (not users). Plan changes are currently
 * made manually in the database. This module is the single source of truth
 * for plan identifiers, labels, and metadata.
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
    description: "For solo owners getting organized.",
    ctaLabel: "Get started free",
    highlighted: false,
  },
  pro: {
    label: "Pro",
    description: "For growing businesses that need more tools.",
    ctaLabel: "Request Pro access",
    highlighted: true,
  },
  business: {
    label: "Business",
    description: "For teams that need collaboration and scale.",
    ctaLabel: "Contact us for Business",
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
