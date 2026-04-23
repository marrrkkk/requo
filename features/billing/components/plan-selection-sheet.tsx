"use client";

import { ArrowUpRight, Crown, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getPlanPriceLabel } from "@/lib/billing/plans";
import type { BillingCurrency, BillingRegion, PaidPlan } from "@/lib/billing/types";
import { planMeta } from "@/lib/plans";
import type { WorkspacePlan } from "@/lib/plans/plans";
import { cn } from "@/lib/utils";

const paidPlans: PaidPlan[] = ["pro", "business"];

const planHighlights: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited inquiries and quotes",
    "Multiple inquiry forms",
    "AI assistant and knowledge",
  ],
  business: [
    "Everything in Pro",
    "Team members and roles",
    "Priority support",
  ],
};

type PlanSelectionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: WorkspacePlan;
  defaultCurrency: BillingCurrency;
  region: BillingRegion;
  targetPlan?: PaidPlan;
  onSelectPlan: (plan: PaidPlan) => void;
};

export function PlanSelectionSheet({
  open,
  onOpenChange,
  currentPlan,
  defaultCurrency,
  region,
  targetPlan,
  onSelectPlan,
}: PlanSelectionSheetProps) {
  const preferredPlan =
    targetPlan && targetPlan !== currentPlan
      ? targetPlan
      : currentPlan === "pro"
        ? "business"
        : "pro";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[92vw] sm:max-w-xl" side="right">
        <SheetHeader>
          <SheetTitle>Choose a plan</SheetTitle>
          <SheetDescription>
            Compare Pro and Business, then continue to checkout with your preferred payment method.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="gap-5">
          <div className="grid gap-4">
            {paidPlans.map((plan) => {
              const isCurrentPlan = currentPlan === plan;
              const isPreferredPlan = preferredPlan === plan && !isCurrentPlan;
              const PlanIcon = plan === "pro" ? Zap : Crown;

              return (
                <Card
                  className={cn(
                    "border-border/70 bg-card/80",
                    isPreferredPlan &&
                      "border-primary/30 bg-accent/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]",
                  )}
                  key={plan}
                >
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/90">
                          <PlanIcon
                            className={cn(
                              "size-4",
                              plan === "pro"
                                ? "fill-current text-primary"
                                : "text-foreground",
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <CardTitle>{planMeta[plan].label}</CardTitle>
                          <CardDescription className="mt-1">
                            {planMeta[plan].description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isCurrentPlan ? (
                          <Badge variant="secondary">Current plan</Badge>
                        ) : null}
                        {isPreferredPlan ? (
                          <Badge variant="outline">Recommended</Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="meta-label">Monthly starting price</p>
                        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                          {getPlanPriceLabel(plan, defaultCurrency, "monthly")}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {planHighlights[plan].map((highlight) => (
                        <p className="text-sm text-muted-foreground" key={highlight}>
                          {highlight}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      disabled={isCurrentPlan}
                      onClick={() => onSelectPlan(plan)}
                      size="lg"
                      type="button"
                    >
                      {isCurrentPlan ? (
                        "Current plan"
                      ) : (
                        <>
                          <ArrowUpRight data-icon="inline-start" />
                          {plan === "pro" ? "Upgrade to Pro" : "Upgrade to Business"}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {region === "PH" ? (
            <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
              QR Ph checkout stays in PHP. Cards and more are billed in USD at checkout.
            </p>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
