"use client";

import { ArrowUpRight, Briefcase, Building2, Lock } from "lucide-react";

import type { WorkspacePlan, PlanFeature } from "@/lib/plans";
import {
  hasFeatureAccess,
  getRequiredPlan,
  planMeta,
  planFeatureLabels,
  planFeatureDescriptions,
  getUpgradeCtaLabel,
} from "@/lib/plans";
import { Button } from "@/components/ui/button";
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
type UpgradeActionProps = {
  workspaceId: string;
  workspaceSlug: string;
  currentPlan: WorkspacePlan;
  region: BillingRegion;
  defaultCurrency: BillingCurrency;
  ctaLabel?: string;
};


/*──────────────────────────────────────────────────────────────────────────────
 * UpgradeBadge — small inline badge that shows the required plan.
 *────────────────────────────────────────────────────────────────────────────*/

export function UpgradeBadge({
  plan,
  className,
}: {
  plan: WorkspacePlan;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1", className)}>
      {planMeta[plan].label}
    </Badge>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * PlanBadge — shows the current workspace plan as a visually distinct badge.
 *────────────────────────────────────────────────────────────────────────────*/

const planBadgeStyles: Record<WorkspacePlan, string> = {
  free: "",
  pro: "border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15",
  business:
    "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:border-violet-400/25 dark:bg-violet-400/15 dark:text-violet-400",
};

export function PlanBadge({
  plan,
  showIcon = true,
  className,
}: {
  plan: WorkspacePlan;
  /** Show plan icon. Set false for compact contexts. */
  showIcon?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant={plan === "free" ? "outline" : "secondary"}
      className={cn(planBadgeStyles[plan], className)}
    >
      {showIcon && plan === "pro" ? (
        <Briefcase className="size-3" />
      ) : null}
      {showIcon && plan === "business" ? (
        <Building2 className="size-3" />
      ) : null}
      {planMeta[plan].label}
    </Badge>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * LockedFeatureCard — a card-sized locked state for gated features.
 *────────────────────────────────────────────────────────────────────────────*/

export function LockedFeatureCard({
  feature,
  plan,
  title,
  description,
  className,
  upgradeAction,
}: {
  feature: PlanFeature;
  plan: WorkspacePlan;
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
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground">
            <Lock className="size-4" />
          </div>
          {requiredPlan ? (
            <Badge variant="secondary">{planMeta[requiredPlan].label}</Badge>
          ) : null}
        </div>
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
            workspaceId={upgradeAction.workspaceId}
            workspaceSlug={upgradeAction.workspaceSlug}
          >
            <ArrowUpRight data-icon="inline-start" />
            {upgradeAction.ctaLabel ?? getUpgradeCtaLabel(plan)}
          </UpgradeButton>
        ) : (
          <Button variant="outline" size="sm" disabled className="pointer-events-none">
            <ArrowUpRight data-icon="inline-start" />
            {getUpgradeCtaLabel(plan)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * LockedFeatureOverlay — wraps children with a blurred overlay + upgrade
 * prompt when a feature is locked for the current plan.
 *────────────────────────────────────────────────────────────────────────────*/

export function LockedFeatureOverlay({
  feature,
  plan,
  children,
  title,
  description,
  className,
}: {
  feature: PlanFeature;
  plan: WorkspacePlan;
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
          <div className="flex size-10 items-center justify-center rounded-lg border border-border/70 bg-muted/50 text-muted-foreground">
            <Lock className="size-4" />
          </div>
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
 *────────────────────────────────────────────────────────────────────────────*/

export function UsageLimitBanner({
  label,
  current,
  limit,
  plan,
  className,
}: {
  label: string;
  current: number;
  limit: number;
  plan: WorkspacePlan;
  className?: string;
}) {
  const percentage = Math.min(100, Math.round((current / limit) * 100));
  const isAtLimit = current >= limit;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3.5",
        isAtLimit
          ? "border-destructive/30 bg-destructive/5"
          : "border-border/70 bg-muted/30",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {label}
        </p>
        <span className="text-sm tabular-nums text-muted-foreground">
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isAtLimit ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtLimit ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          You&apos;ve reached this workspace&apos;s plan limit.{" "}
          {getUpgradeCtaLabel(plan)} for unlimited usage.
        </p>
      ) : null}
    </div>
  );
}

/*──────────────────────────────────────────────────────────────────────────────
 * LockedFeaturePage — full-page locked state for gated dashboard sections.
 *────────────────────────────────────────────────────────────────────────────*/

export function LockedFeaturePage({
  feature,
  plan,
  title,
  description,
  className,
  upgradeAction,
}: {
  feature: PlanFeature;
  plan: WorkspacePlan;
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
        <div className="flex size-11 items-center justify-center rounded-lg border border-border/75 bg-muted/50 text-muted-foreground">
          <Lock className="size-4" />
        </div>
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
              workspaceId={upgradeAction.workspaceId}
              workspaceSlug={upgradeAction.workspaceSlug}
            >
              <ArrowUpRight data-icon="inline-start" />
              {upgradeAction.ctaLabel ?? planMeta[requiredPlan].ctaLabel}
            </UpgradeButton>
          ) : (
            <Button variant="outline" size="sm" disabled className="pointer-events-none">
              <ArrowUpRight data-icon="inline-start" />
              {planMeta[requiredPlan].ctaLabel}
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
