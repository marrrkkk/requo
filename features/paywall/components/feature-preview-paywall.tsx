import { Badge } from "@/components/ui/badge";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { PlanFeature } from "@/lib/plans/entitlements";
import { cn } from "@/lib/utils";

import {
  safeHasFeatureAccess,
  getUpgradeDescription,
  getRequiredPlanLabel,
} from "../lib/utils";
import { UpgradePrompt } from "./upgrade-prompt";
import type { UpgradeActionProps } from "../types";

type FeaturePreviewPaywallProps = {
  /** Feature to check entitlement against */
  feature: PlanFeature;
  /** Current business plan */
  plan: BusinessPlan;
  /** Preview/demo content to show when locked (optional) */
  previewContent?: React.ReactNode;
  /** Description of the feature for the upgrade prompt */
  description?: string;
  /** Upgrade action props for UpgradeButton integration */
  upgradeAction?: UpgradeActionProps;
  /** The unlocked content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
};

/**
 * FeaturePreviewPaywall
 *
 * Renders the actual page layout for a premium feature. When the user has access,
 * children render normally. When locked, the component shows either:
 * - Preview content with a "Demo data" badge + banner UpgradePrompt (if previewContent provided)
 * - An empty-state UpgradePrompt with the feature description (if no previewContent)
 *
 * Never applies full-page blur or opaque overlay.
 */
export function FeaturePreviewPaywall({
  feature,
  plan,
  previewContent,
  description,
  upgradeAction,
  children,
  className,
}: FeaturePreviewPaywallProps) {
  // Unlocked: render children normally
  if (safeHasFeatureAccess(plan, feature)) {
    return <>{children}</>;
  }

  const featureDescription = description || getUpgradeDescription(feature);
  const requiredPlanLabel = getRequiredPlanLabel(feature);

  // Locked with previewContent: show preview + "Demo data" badge + banner UpgradePrompt
  if (previewContent) {
    return (
      <div
        className={cn("flex flex-col gap-4", className)}
        role="region"
        aria-label={`${featureDescription} — requires ${requiredPlanLabel} plan`}
      >
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary">Demo data</Badge>
          </div>
          <div aria-hidden="true">{previewContent}</div>
        </div>
        <UpgradePrompt
          variant="banner"
          description={featureDescription}
          plan={plan}
          feature={feature}
          showBadge
          upgradeAction={upgradeAction}
        />
      </div>
    );
  }

  // Locked without previewContent: show empty-state UpgradePrompt
  return (
    <div
      className={cn("flex flex-col", className)}
      role="region"
      aria-label={`${featureDescription} — requires ${requiredPlanLabel} plan`}
    >
      <UpgradePrompt
        variant="empty-state"
        description={featureDescription}
        plan={plan}
        feature={feature}
        showBadge
        upgradeAction={upgradeAction}
      />
    </div>
  );
}
