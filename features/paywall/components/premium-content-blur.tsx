import type { BusinessPlan } from "@/lib/plans/plans";
import type { PlanFeature } from "@/lib/plans/entitlements";
import { cn } from "@/lib/utils";

import {
  safeHasFeatureAccess,
  getUpgradeDescription,
  getFeatureLabel,
  getRequiredPlanLabel,
} from "../lib/utils";
import { UpgradePrompt } from "./upgrade-prompt";
import type { UpgradeActionProps } from "../types";

type PremiumContentBlurProps = {
  /** Feature to check entitlement against */
  feature: PlanFeature;
  /** Current business plan */
  plan: BusinessPlan;
  /** Static placeholder content to show when locked (blurred) */
  placeholder: React.ReactNode;
  /** The actual premium content (only rendered when unlocked) */
  children: React.ReactNode;
  /** Upgrade action props for UpgradeButton integration */
  upgradeAction?: UpgradeActionProps;
  /** Additional className */
  className?: string;
};

/**
 * PremiumContentBlur
 *
 * Blurs only premium-generated outputs (analytics insights, AI suggestions, reports)
 * while keeping the surrounding page visible. When locked, renders a static placeholder
 * with a blur effect and a centered upgrade prompt overlay.
 *
 * CRITICAL: When locked, children (premium data) are NOT rendered in the DOM at all.
 * Only the placeholder prop is rendered (blurred) with the UpgradePrompt overlay.
 */
export function PremiumContentBlur({
  feature,
  plan,
  placeholder,
  children,
  upgradeAction,
  className,
}: PremiumContentBlurProps) {
  const hasAccess = safeHasFeatureAccess(plan, feature);

  // Unlocked: render children normally without any blur or overlay
  if (hasAccess) {
    return <>{children}</>;
  }

  // Locked: render placeholder (blurred) with UpgradePrompt overlay
  // Do NOT render children — premium data must not be accessible
  const featureLabel = getFeatureLabel(feature);
  const planLabel = getRequiredPlanLabel(feature);
  const description = getUpgradeDescription(feature);

  return (
    <div
      role="region"
      aria-label={`Premium feature: ${featureLabel} — requires ${planLabel} plan`}
      className={cn("relative", className)}
    >
      {/* Blurred placeholder — not interactive, hidden from assistive tech */}
      <div
        className="blur-[3px] pointer-events-none select-none"
        aria-hidden="true"
      >
        {placeholder}
      </div>

      {/* Centered upgrade prompt overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <UpgradePrompt
          variant="inline"
          plan={plan}
          feature={feature}
          description={description}
          showBadge
          upgradeAction={upgradeAction}
        />
      </div>
    </div>
  );
}
