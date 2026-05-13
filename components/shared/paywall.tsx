"use client";

import { ArrowUpRight, Briefcase, Building2 } from "lucide-react";

import type { BusinessPlan as plan } from "@/lib/plans/plans";
import type { PlanFeature } from "@/lib/plans";
import {
  hasFeatureAccess,
  getRequiredPlan,
  planMeta,
  planFeatureLabels,
  planFeatureDescriptions,
  getUpgradeCtaLabel,
} from "@/lib/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import type { BillingCurrency, BillingRegion } from "@/lib/billing/types";
import { ProFeatureNoticeButton } from "@/components/shared/pro-feature-notice-button";

type UpgradeActionProps = {
  userId: string;
  businessId: string;
  businessSlug: string;
  currentPlan: plan;
  region: BillingRegion;
  defaultCurrency: BillingCurrency;
  ctaLabel?: string;
};

/*──────────────────────────────────────────────────────────────────────────────
 * UpgradeBadge — small inline badge that shows the required plan.
 *────────────────────────────────────────────────────────────────────────────*/

/**
 * @deprecated Use `UpgradePrompt` with `showBadge` from `@/features/paywall` instead.
 * This component remains for unmigrated routes and will be removed once migration is complete.
 */
export function UpgradeBadge({
  plan,
  className,
}: {
  plan: plan;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1", className)}>
      {planMeta[plan].label}
    </Badge>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * PlanBadge — shows the current business plan as a visually distinct badge.
 *
 * Note: PlanBadge is a utility display component, not a paywall component.
 * It may be moved to a shared location in the future but is not deprecated.
 *────────────────────────────────────────────────────────────────────────────*/

const planBadgeStyles: Record<plan, string> = {
  free: "border-border/80 bg-muted/60 text-muted-foreground shadow-[var(--control-shadow)] dark:bg-muted/40",
  pro: "border-primary/30 bg-primary/10 text-primary shadow-[var(--control-shadow)] dark:border-primary/25 dark:bg-primary/15",
  business:
    "border-violet-300/50 bg-violet-500/10 text-violet-700 shadow-[var(--control-shadow)] dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-400",
};

export function PlanBadge({
  plan,
  className,
}: {
  plan: plan;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold",
        planBadgeStyles[plan],
        className,
      )}
    >
      {planMeta[plan].label}
    </span>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * LockedFeatureCard — a card-sized locked state for gated features.
 *────────────────────────────────────────────────────────────────────────────*/

/**
 * @deprecated Use `UpgradePrompt` with `variant="card"` from `@/features/paywall` instead.
 * This component remains for unmigrated routes and will be removed once migration is complete.
 * @see {@link @/features/paywall} for the new unified paywall system.
 */
export function LockedFeatureCard({
  feature,
  plan,
  title,
  description,
  className,
  upgradeAction,
}: {
  feature: PlanFeature;
  plan: plan;
  /** Override the default feature title. */
  title?: string;
  /** Override the default feature description. */
  description?: string;
  className?: string;
  upgradeAction?: UpgradeActionProps;
}) {
  if (hasFeatureAccess(plan, feature)) {
    return null;
  }

  const requiredPlan = getRequiredPlan(feature);
  const displayTitle = title ?? planFeatureLabels[feature];
  const displayDescription = description ?? planFeatureDescriptions[feature];

  return (
    <Card
      className={cn(
        "border-dashed border-border/70 bg-card/50",
        className,
      )}
    >
      <CardHeader className="gap-3 pb-4">
        {requiredPlan ? (
          <div className="flex justify-end">
            <Badge variant="secondary">{planMeta[requiredPlan].label}</Badge>
          </div>
        ) : null}
        <div>
          <CardTitle>{displayTitle}</CardTitle>
          <CardDescription className="mt-1.5">
            {displayDescription}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {upgradeAction ? (
          <UpgradeButton
            currentPlan={upgradeAction.currentPlan}
            defaultCurrency={upgradeAction.defaultCurrency}
            region={upgradeAction.region}
            size="sm"
            userId={upgradeAction.userId}
            businessId={upgradeAction.businessId}
            businessSlug={upgradeAction.businessSlug}
          >
            <ArrowUpRight data-icon="inline-start" />
            {upgradeAction.ctaLabel ?? getUpgradeCtaLabel(plan)}
          </UpgradeButton>
        ) : (
          <ProFeatureNoticeButton
            noticeDescription={displayDescription}
            noticeTitle={
              requiredPlan
                ? `${displayTitle} requires ${planMeta[requiredPlan].label}.`
                : "This is a Pro feature."
            }
            size="sm"
            variant="outline"
          >
            <ArrowUpRight data-icon="inline-start" />
            {getUpgradeCtaLabel(plan)}
          </ProFeatureNoticeButton>
        )}
      </CardContent>
    </Card>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * LockedFeatureOverlay — wraps children with a blurred overlay + upgrade
 * prompt when a feature is locked for the current plan.
 *────────────────────────────────────────────────────────────────────────────*/

/**
 * @deprecated Use `PremiumContentBlur` from `@/features/paywall` for premium-generated outputs,
 * or `FeaturePreviewPaywall` from `@/features/paywall` for page sections with static content.
 * This component remains for unmigrated routes and will be removed once migration is complete.
 * @see {@link @/features/paywall} for the new unified paywall system.
 */
export function LockedFeatureOverlay({
  feature,
  plan,
  children,
  title,
  description,
  className,
}: {
  feature: PlanFeature;
  plan: plan;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}) {
  if (hasFeatureAccess(plan, feature)) {
    return <>{children}</>;
  }

  const requiredPlan = getRequiredPlan(feature);
  const displayTitle = title ?? planFeatureLabels[feature];
  const displayDescription = description ?? planFeatureDescriptions[feature];

  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none select-none opacity-[0.35] blur-[2px]"
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-border/80 bg-card/95 px-6 py-6 text-center shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              {displayTitle}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {displayDescription}
            </p>
          </div>
          {requiredPlan ? (
            <Badge variant="secondary">{planMeta[requiredPlan].ctaLabel}</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * UsageLimitBanner — inline banner showing monthly usage progress.
 *
 * @deprecated Use `UsageLimitBanner` from `@/features/paywall` instead.
 * This re-export exists for migration compatibility and will be removed
 * once all consumers are updated.
 *────────────────────────────────────────────────────────────────────────────*/

export { UsageLimitBanner } from "@/features/paywall/components/usage-limit-banner";

/*──────────────────────────────────────────────────────────────────────────────
 * LockedFeaturePage — full-page locked state for gated dashboard sections.
 *────────────────────────────────────────────────────────────────────────────*/

/**
 * @deprecated Use `FeaturePreviewPaywall` from `@/features/paywall` for pages with previewable content,
 * or `UpgradePrompt` with `variant="empty-state"` from `@/features/paywall` for pages with no renderable content.
 * This component remains for unmigrated routes and will be removed once migration is complete.
 * @see {@link @/features/paywall} for the new unified paywall system.
 */
export function LockedFeaturePage({
  feature,
  plan,
  title,
  description,
  className,
  upgradeAction,
}: {
  feature: PlanFeature;
  plan: plan;
  title?: string;
  description?: string;
  className?: string;
  upgradeAction?: UpgradeActionProps;
}) {
  if (hasFeatureAccess(plan, feature)) {
    return null;
  }

  const requiredPlan = getRequiredPlan(feature);
  const displayTitle = title ?? planFeatureLabels[feature];
  const displayDescription = description ?? planFeatureDescriptions[feature];

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border/80 p-8 text-center text-balance",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {displayTitle}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {displayDescription}
          </p>
        </div>
        {requiredPlan ? (
          upgradeAction ? (
            <UpgradeButton
              currentPlan={upgradeAction.currentPlan}
              defaultCurrency={upgradeAction.defaultCurrency}
              region={upgradeAction.region}
              size="sm"
              userId={upgradeAction.userId}
              businessId={upgradeAction.businessId}
              businessSlug={upgradeAction.businessSlug}
            >
              <ArrowUpRight data-icon="inline-start" />
              {upgradeAction.ctaLabel ?? planMeta[requiredPlan].ctaLabel}
            </UpgradeButton>
          ) : (
            <ProFeatureNoticeButton
              noticeDescription={displayDescription}
              noticeTitle={`${displayTitle} requires ${planMeta[requiredPlan].label}.`}
              size="sm"
              variant="outline"
            >
              <ArrowUpRight data-icon="inline-start" />
              {planMeta[requiredPlan].ctaLabel}
            </ProFeatureNoticeButton>
          )
        ) : null}
      </div>
    </div>
  );
}
