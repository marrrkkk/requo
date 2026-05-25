"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getMonthlyEquivalentLabel,
  getPlanPriceLabel,
  getYearlySavingsPercent,
} from "@/lib/billing/plans";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import { planMeta } from "@/lib/plans";
import type { BusinessPlan } from "@/lib/plans/plans";
import { cn } from "@/lib/utils";

type PlanCard = {
  id: BusinessPlan;
  tagline: string;
  highlights: string[];
};

const planCards: PlanCard[] = [
  {
    id: "free",
    tagline: "For solo operators",
    highlights: [
      "Inquiries and quotes",
      "Follow-up reminders",
      "AI assistant",
      "Basic automations",
    ],
  },
  {
    id: "pro",
    tagline: "For growing businesses",
    highlights: [
      "Unlimited inquiries and quotes",
      "Auto follow-ups",
      "Workflow automations",
      "Multiple businesses",
    ],
  },
  {
    id: "business",
    tagline: "For teams",
    highlights: [
      "Everything in Pro",
      "Team members and roles",
      "Visual workflow builder",
      "Advanced branding",
    ],
  },
];

type PlanSelectionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: BusinessPlan;
  targetPlan?: PaidPlan;
  onSelectPlan: (plan: PaidPlan, interval: BillingInterval) => void;
};

export function PlanSelectionSheet({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  onSelectPlan,
}: PlanSelectionSheetProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] lg:max-w-[860px]">
        <DialogHeader className="border-b-0">
          <DialogTitle>Upgrade Plan</DialogTitle>
          <DialogDescription>
            Choose the plan that fits your workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
          {/* Billing interval toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => setInterval("yearly")}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  interval === "yearly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Annual
                <Badge variant="secondary" className="px-1 font-medium text-[10px]">
                  -{getYearlySavingsPercent("pro", "USD")}%
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={cn(
                  "relative inline-flex items-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  interval === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {planCards.map((card) => {
              const isCurrentPlan = currentPlan === card.id;
              const isPreferredPlan =
                !isCurrentPlan &&
                (targetPlan === card.id ||
                  (!targetPlan && card.id === "pro" && currentPlan === "free") ||
                  (!targetPlan && card.id === "business" && currentPlan === "pro"));
              const isPaidPlan = card.id !== "free";

              return (
                <div
                  className={cn(
                    "flex flex-col rounded-xl border border-border/70 bg-card/80 p-4",
                    isPreferredPlan &&
                      "border-primary/30 bg-accent/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]",
                  )}
                  key={card.id}
                >
                  {/* Plan name */}
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {planMeta[card.id].label}
                  </h3>

                  {/* Price */}
                  <div className="mt-1.5">
                    {isPaidPlan ? (
                      <>
                        <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                          {getPlanPriceLabel(card.id as PaidPlan, "USD", interval)}
                        </p>
                        {interval === "yearly" ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {getMonthlyEquivalentLabel(card.id as PaidPlan, "USD")} per month
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            billed monthly
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                          $0
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          free forever
                        </p>
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-3">
                    {isCurrentPlan ? (
                      <Button
                        className="w-full"
                        disabled
                        variant="outline"
                        size="sm"
                        type="button"
                      >
                        Current plan
                      </Button>
                    ) : isPaidPlan ? (
                      <Button
                        className="w-full"
                        onClick={() => onSelectPlan(card.id as PaidPlan, interval)}
                        variant={isPreferredPlan ? "default" : "outline"}
                        size="sm"
                        type="button"
                      >
                        <ArrowUpRight data-icon="inline-start" />
                        {card.id === "pro" ? "Upgrade to Pro" : "Upgrade to Business"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled
                        variant="outline"
                        size="sm"
                        type="button"
                      >
                        Free plan
                      </Button>
                    )}
                  </div>

                  {/* Features */}
                  <p className="mt-4 text-xs font-medium text-muted-foreground">
                    {card.tagline}
                  </p>
                  <ul className="mt-2 grid gap-1.5">
                    {card.highlights.map((highlight) => (
                      <li className="flex items-start gap-2" key={highlight}>
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {highlight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
