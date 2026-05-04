"use client";

/**
 * Client-side pricing cards section with monthly/yearly toggle.
 * Extracted from the server-rendered PricingPage so interval state
 * can be managed client-side without making the whole page a client component.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { planMeta } from "@/lib/plans";
import { getYearlySavingsPercent, getMonthlyEquivalentLabel, getPlanPriceLabel } from "@/lib/billing/plans";
import type { BillingCurrency, BillingInterval } from "@/lib/billing/types";
import type { WorkspacePlan } from "@/lib/plans/plans";
import { formatUsageLimitValue, getUsageLimit } from "@/lib/plans";

const planHighlights: Record<WorkspacePlan, string[]> = {
  free: [
    `${getUsageLimit("free", "inquiriesPerMonth")} inquiries per month`,
    `${getUsageLimit("free", "quotesPerMonth")} quotes per month`,
    "Public inquiry pages",
    "Quote workflow",
    `${getUsageLimit("free", "customFieldsPerForm")} custom fields per form`,
    `${formatUsageLimitValue(
      "publicInquiryAttachmentMaxBytes",
      getUsageLimit("free", "publicInquiryAttachmentMaxBytes"),
    )} uploads`,
    "Dashboard & overview analytics",
    "Activity log",
  ],
  pro: [
    "Unlimited inquiries and quotes",
    "Conversion & workflow analytics",
    "Multiple inquiry forms",
    "Inquiry page customization",
    `${formatUsageLimitValue(
      "publicInquiryAttachmentMaxBytes",
      getUsageLimit("pro", "publicInquiryAttachmentMaxBytes"),
    )} uploads`,
    "AI assistant & knowledge",
    "Saved replies, email templates & quote library",
    "Data exports & advanced branding",
    "Multiple businesses",
  ],
  business: [
    "Everything in Pro",
    "Team members & roles",
    `${formatUsageLimitValue(
      "publicInquiryAttachmentMaxBytes",
      getUsageLimit("business", "publicInquiryAttachmentMaxBytes"),
    )} uploads`,
    "Priority support",
  ],
};

function getPlanCardConfig(currency: BillingCurrency, interval: BillingInterval) {
  return [
    {
      plan: "free" as WorkspacePlan,
      price: currency === "PHP" ? "₱0" : "$0",
      pricePeriod: "forever",
      monthlyEquivalent: null,
      highlighted: false,
      cta: { label: "Get started free", href: "/signup", variant: "outline" as const },
      includes: "Core workflow for a single business:",
    },
    {
      plan: "pro" as WorkspacePlan,
      price: getPlanPriceLabel("pro", currency, interval).replace(interval === "monthly" ? "/mo" : "/yr", ""),
      pricePeriod: interval === "monthly" ? "month" : "year",
      monthlyEquivalent: interval === "yearly" ? getMonthlyEquivalentLabel("pro", currency) : null,
      highlighted: true,
      cta: {
        label: "Upgrade to Pro",
        href: "/signup",
        variant: "default" as const,
      },
      includes: "Everything in Free, plus:",
    },
    {
      plan: "business" as WorkspacePlan,
      price: getPlanPriceLabel("business", currency, interval).replace(interval === "monthly" ? "/mo" : "/yr", ""),
      pricePeriod: interval === "monthly" ? "month" : "year",
      monthlyEquivalent: interval === "yearly" ? getMonthlyEquivalentLabel("business", currency) : null,
      highlighted: false,
      cta: {
        label: "Upgrade to Business",
        href: "/signup",
        variant: "outline" as const,
      },
      includes: "Everything in Pro, plus:",
    },
  ];
}
export function PricingIntervalToggle({ currency }: { currency: BillingCurrency }) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const savingsPercent = getYearlySavingsPercent("pro", currency);
  const planCards = getPlanCardConfig(currency, interval);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Toggle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="inline-flex rounded-full border border-border/70 bg-muted/30 p-1">
          <button
            className={cn(
              "relative rounded-full px-5 py-2 text-sm font-medium transition-all",
              interval === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setInterval("monthly")}
            type="button"
          >
            Monthly
          </button>
          <button
            className={cn(
              "relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all",
              interval === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setInterval("yearly")}
            type="button"
          >
            Yearly
            <Badge
              variant="secondary"
              className="border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-400"
            >
              Save {savingsPercent}%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {planCards.map((config) => (
          <div
            className={cn(
              "flex flex-col rounded-xl border p-6",
              config.highlighted
                ? "border-primary/30 bg-accent/20 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                : "border-border/70 bg-card/60",
            )}
            key={config.plan}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant={config.highlighted ? "default" : "secondary"}
                >
                  {planMeta[config.plan].label}
                </Badge>
                {config.highlighted ? (
                  <Badge variant="outline">Most popular</Badge>
                ) : null}
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                    {config.price}
                  </span>
                  {config.pricePeriod ? (
                    <span className="text-sm text-muted-foreground">
                      /{config.pricePeriod}
                    </span>
                  ) : null}
                </div>
                {config.monthlyEquivalent ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config.monthlyEquivalent} billed yearly
                  </p>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {planMeta[config.plan].description}
              </p>
            </div>

            <Separator className="my-5 bg-border/60" />

            <div className="flex flex-1 flex-col gap-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {config.includes}
              </p>
              <ul className="grid gap-3">
                {planHighlights[config.plan].map((item) => (
                  <li className="flex items-start gap-2.5 text-sm leading-6 text-foreground" key={item}>
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <Button
                asChild
                className="w-full"
                size="lg"
                variant={config.cta.variant}
              >
                <Link href={config.cta.href}>
                  {config.cta.label}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
