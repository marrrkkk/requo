"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Briefcase, Building2, XIcon } from "lucide-react";

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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getMonthlyEquivalentLabel,
  getPlanPriceLabel,
  getYearlySavingsPercent,
} from "@/lib/billing/plans";
import type { BillingCurrency, BillingInterval, BillingRegion, PaidPlan } from "@/lib/billing/types";
import { planMeta } from "@/lib/plans";
import type { BusinessPlan as plan } from "@/lib/plans/plans";
import { cn } from "@/lib/utils";

const paidPlans: PaidPlan[] = ["pro", "business"];

const planHighlights: Record<PaidPlan, string[]> = {
  pro: [
    "Unlimited inquiries and quotes",
    "Follow-up reminders and quote tracking",
  ],
  business: [
    "Everything in Pro",
    "Team members and roles",
  ],
};

type PlanSelectionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: plan;
  defaultCurrency: BillingCurrency;
  region: BillingRegion;
  targetPlan?: PaidPlan;
  onSelectPlan: (plan: PaidPlan, interval: BillingInterval) => void;
};

export function PlanSelectionSheet({
  open,
  onOpenChange,
  currentPlan,
  defaultCurrency,
  region: _region,
  targetPlan,
  onSelectPlan,
}: PlanSelectionSheetProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const preferredPlan =
    targetPlan && targetPlan !== currentPlan
      ? targetPlan
      : currentPlan === "pro"
        ? "business"
        : "pro";

  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] w-full overflow-hidden rounded-t-2xl border border-border/70 border-b-0 bg-card/95 sm:mx-auto sm:w-[calc(100%-1.5rem)] sm:max-w-[52rem] lg:max-w-[68rem] xl:max-w-[76rem]"
      >
        <DrawerHeader className="border-b border-border/70 px-5 py-4 pr-14 sm:px-6 sm:py-4">
          <DrawerTitle>Choose a plan</DrawerTitle>
          <DrawerDescription>
            Compare Pro and Business, then continue to checkout.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerClose asChild>
          <Button
            className="absolute top-4 right-4 sm:top-5 sm:right-5"
            size="icon-sm"
            variant="ghost"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </DrawerClose>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
          {/* Billing interval toggle */}
          <div className="flex justify-center">
            <Tabs
              onValueChange={(value) =>
                setInterval(value === "yearly" ? "yearly" : "monthly")
              }
              value={interval}
              className="w-full max-w-[280px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly
                  <Badge variant="secondary" className="ml-1.5 px-1 font-medium text-[10px]">
                    -{getYearlySavingsPercent("pro", defaultCurrency)}%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {paidPlans.map((plan) => {
              const isCurrentPlan = currentPlan === plan;
              const isPreferredPlan = preferredPlan === plan && !isCurrentPlan;
              const PlanIcon = plan === "pro" ? Briefcase : Building2;

              return (
                <Card
                  className={cn(
                    "flex h-full flex-col border-border/70 bg-card/80",
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
                                ? "text-primary"
                                : "text-foreground",
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <CardTitle>{planMeta[plan].label}</CardTitle>
                          <CardDescription className="mt-1 min-h-[40px] line-clamp-2">
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
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="meta-label">
                          {interval === "yearly" ? "Yearly price" : "Monthly price"}
                        </p>
                        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                          {getPlanPriceLabel(plan, defaultCurrency, interval)}
                        </p>
                        {interval === "yearly" ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {getMonthlyEquivalentLabel(plan, defaultCurrency)} per month
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {planHighlights[plan].map((highlight) => (
                        <div className="flex items-start gap-2" key={highlight}>
                          <p className="text-sm text-muted-foreground">
                            {highlight}
                          </p>
                        </div>
                      ))}
                      <Link
                        href="/pricing"
                        target="_blank"
                        className="mt-1 text-sm font-medium text-primary hover:underline"
                      >
                        See all features &rarr;
                      </Link>
                    </div>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    <Button
                      className="w-full"
                      disabled={isCurrentPlan}
                      onClick={() => onSelectPlan(plan, interval)}
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
