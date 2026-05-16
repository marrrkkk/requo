import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { PlanFeature } from "@/lib/plans/entitlements";
import { cn } from "@/lib/utils";

import {
  safeHasFeatureAccess,
  getUpgradeDescription,
  getFeatureLabel,
  getRequiredPlanLabel,
  getUpgradeCtaText,
} from "../lib/utils";
import type { UpgradeActionProps } from "../types";

type PremiumContentBlurProps = {
  /** Feature to check entitlement against */
  feature: PlanFeature;
  /** Current business plan */
  plan: BusinessPlan;
  /** Static placeholder content to show when locked */
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
 * Shows premium content when unlocked. When locked, renders a clean upgrade
 * card with feature description and CTA — no blur overlay.
 *
 * CRITICAL: When locked, children (premium data) are NOT rendered in the DOM at all.
 */
export function PremiumContentBlur({
  feature,
  plan,
  placeholder: _placeholder,
  children,
  upgradeAction,
  className,
}: PremiumContentBlurProps) {
  const hasAccess = safeHasFeatureAccess(plan, feature);

  // Unlocked: render children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // Locked: render upgrade card
  const featureLabel = getFeatureLabel(feature);
  const planLabel = getRequiredPlanLabel(feature);
  const description = getUpgradeDescription(feature);
  const ctaText = getUpgradeCtaText(plan);

  return (
    <div
      role="region"
      aria-label={`Premium feature: ${featureLabel} — requires ${planLabel} plan`}
      className={cn("flex flex-col gap-6", className)}
    >
      <Card className="border-border/70 bg-card/50">
        <CardHeader className="gap-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
              <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{featureLabel}</CardTitle>
                <Badge variant="secondary">{planLabel}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {ctaText ? (
            <div>
              {upgradeAction ? (
                <UpgradeButton
                  userId={upgradeAction.userId}
                  businessId={upgradeAction.businessId}
                  businessSlug={upgradeAction.businessSlug}
                  currentPlan={upgradeAction.currentPlan}
                  size="default"
                >
                  <ArrowUpRight data-icon="inline-start" />
                  {ctaText}
                </UpgradeButton>
              ) : (
                <Button asChild>
                  <Link href="/account/billing">
                    <ArrowUpRight data-icon="inline-start" />
                    {ctaText}
                  </Link>
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
