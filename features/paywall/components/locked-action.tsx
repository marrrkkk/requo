"use client";

import { useState } from "react";
import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import type { BusinessPlan } from "@/lib/plans/plans";
import type { PlanFeature } from "@/lib/plans/entitlements";
import { cn } from "@/lib/utils";

import {
  getRequiredPlanLabel,
  getUpgradeCtaText,
  getUpgradeDescription,
  safeHasFeatureAccess,
} from "../lib/utils";
import type { UpgradeActionProps } from "../types";

type LockedActionProps = {
  /** Feature to check entitlement against */
  feature: PlanFeature;
  /** Current business plan */
  plan: BusinessPlan;
  /** Value description for the upgrade popover (falls back to planFeatureDescriptions) */
  description?: string;
  /** Upgrade action props for the popover CTA */
  upgradeAction?: UpgradeActionProps;
  /** The action element to wrap (button, link, etc.) */
  children: React.ReactElement;
  /** Additional className for the wrapper */
  className?: string;
};

function UpgradeCta({
  upgradeAction,
  ctaText,
}: {
  upgradeAction?: UpgradeActionProps;
  ctaText: string;
}) {
  const touchTargetClasses = "min-h-11 min-w-11 md:min-h-0 md:min-w-0";

  if (upgradeAction) {
    return (
      <UpgradeButton
        userId={upgradeAction.userId}
        businessId={upgradeAction.businessId}
        businessSlug={upgradeAction.businessSlug}
        currentPlan={upgradeAction.currentPlan}
        region={upgradeAction.region}
        defaultCurrency={upgradeAction.defaultCurrency}
        size="sm"
        className={touchTargetClasses}
      >
        <ArrowUpRight data-icon="inline-start" />
        {ctaText}
      </UpgradeButton>
    );
  }

  return (
    <Button asChild size="sm" className={touchTargetClasses}>
      <Link href="/account/billing">
        <ArrowUpRight data-icon="inline-start" />
        {ctaText}
      </Link>
    </Button>
  );
}

export function LockedAction({
  feature,
  plan,
  description,
  upgradeAction,
  children,
  className,
}: LockedActionProps) {
  const [open, setOpen] = useState(false);

  // If the user has access, render children normally (passthrough)
  if (safeHasFeatureAccess(plan, feature)) {
    return children;
  }

  // Locked state
  const requiredPlanLabel = getRequiredPlanLabel(feature);
  const featureDescription = description ?? getUpgradeDescription(feature);
  const ctaText = getUpgradeCtaText(plan);

  // If no CTA text (business plan), just render children — shouldn't happen
  // since we already checked access, but defensive fallback
  if (!ctaText) {
    return children;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="group"
          aria-label={`${requiredPlanLabel} plan required`}
          aria-disabled="true"
          tabIndex={0}
          className={cn(
            "relative inline-flex min-h-11 min-w-11 items-center justify-center md:min-h-0 md:min-w-0",
            className,
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }
          }}
        >
          {/* Render child with reduced opacity */}
          <div className="pointer-events-none opacity-50" aria-hidden="true">
            {children}
          </div>

          {/* Lock icon appended */}
          <Lock
            className="absolute -right-1 -top-1 size-3.5 text-muted-foreground"
            aria-hidden="true"
          />

          {/* Plan badge overlay */}
          <Badge
            variant="secondary"
            className="absolute -right-2 -bottom-2 scale-75"
          >
            {requiredPlanLabel}
          </Badge>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className="w-72 motion-reduce:!duration-0 motion-reduce:!animate-none"
      >
        <PopoverHeader>
          <PopoverTitle>{requiredPlanLabel} Plan</PopoverTitle>
          <PopoverDescription>{featureDescription}</PopoverDescription>
        </PopoverHeader>
        <UpgradeCta upgradeAction={upgradeAction} ctaText={ctaText} />
      </PopoverContent>
    </Popover>
  );
}
