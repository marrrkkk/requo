"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  getYearlySavingsPercent,
  getMonthlyEquivalentLabel,
  getPlanPrice,
  getPlanPriceLabel,
} from "@/lib/billing/plans";
import {
  getPhpApproximation,
  getPhpDisclaimer,
} from "@/lib/billing/adaptive-currency";
import { startDodoCheckout } from "@/features/billing/start-checkout";
import { getAuthPathWithNext } from "@/lib/auth/redirects";
import type {
  BillingCurrency,
  BillingInterval,
  BillingRegion,
  PaidPlan,
} from "@/lib/billing/types";

export function PricingIntervalToggle({
  currency,
  region,
}: {
  currency: BillingCurrency;
  region: BillingRegion;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null);
  const [isPending, startTransition] = useTransition();
  const savingsPercent = getYearlySavingsPercent("pro", currency);

  function handleSubscribe(plan: PaidPlan) {
    if (isPending) return;
    setPendingPlan(plan);
    startTransition(async () => {
      const result = await startDodoCheckout({ plan, interval });
      if (result.ok) {
        setPendingPlan(null);
        return;
      }

      if (result.reason === "unauthorized") {
        const next = `/pricing?plan=${plan}&interval=${interval}`;
        window.location.assign(getAuthPathWithNext("/login", next));
        return;
      }

      if (result.reason === "already_subscribed") {
        toast.info(result.message);
        setPendingPlan(null);
        return;
      }

      toast.error(result.message);
      setPendingPlan(null);
    });
  }

  const proPrice = getPlanPriceLabel("pro", currency, interval).replace(
    interval === "monthly" ? "/mo" : "/yr",
    "",
  );
  const businessPrice = getPlanPriceLabel("business", currency, interval).replace(
    interval === "monthly" ? "/mo" : "/yr",
    "",
  );
  const proMonthly =
    interval === "yearly" ? getMonthlyEquivalentLabel("pro", currency) : null;
  const businessMonthly =
    interval === "yearly"
      ? getMonthlyEquivalentLabel("business", currency)
      : null;
  const period = interval === "monthly" ? "mo" : "yr";

  const showPhpApproximation = region === "PH";
  const proPhpDisclaimer = showPhpApproximation
    ? getPhpDisclaimer(
        getPhpApproximation(getPlanPrice("pro", "USD", interval)),
        interval,
      )
    : null;
  const businessPhpDisclaimer = showPhpApproximation
    ? getPhpDisclaimer(
        getPhpApproximation(getPlanPrice("business", "USD", interval)),
        interval,
      )
    : null;

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Toggle */}
      <div className="mb-12 flex justify-center">
        <div className="inline-flex rounded-full border border-border/70 bg-muted/25 p-1">
          <button
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
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
              "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors",
              interval === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setInterval("yearly")}
            type="button"
          >
            Yearly
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400">
              -{savingsPercent}%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Free
          </p>
          <p className="mt-4 font-heading text-4xl font-semibold tracking-tight text-foreground">
            $0
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No card required
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The full inquiry-to-quote loop for a single business. No time limit.
          </p>

          <Button asChild variant="outline" size="lg" className="mt-6 w-full">
            <Link href="/businesses">Start free</Link>
          </Button>

          <ul className="mt-7 flex flex-col gap-2.5 border-t border-border/50 pt-6">
            <Feature>Unlimited inquiries</Feature>
            <Feature>30 quotes / month</Feature>
            <Feature>3 active follow-ups</Feature>
            <Feature>Customer history</Feature>
            <Feature>Conversion analytics</Feature>
            <Feature>Public pages for inquiries & quotes</Feature>
            <Feature>3 custom fields per form</Feature>
            <Feature>5 MB uploads</Feature>
          </ul>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-2xl border border-primary/25 bg-card p-6 shadow-[0_2px_20px_-4px_hsl(var(--primary)/0.08)] ring-1 ring-primary/[0.06] sm:p-7">
          <Badge className="absolute top-5 right-6 sm:right-7">
            Popular
          </Badge>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Pro
          </p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-heading text-4xl font-semibold tracking-tight text-foreground">
              {proPrice}
            </span>
            <span className="text-sm text-muted-foreground">/{period}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {proMonthly
              ? `${proMonthly} billed monthly`
              : "Cancel anytime"}
          </p>
          {proPhpDisclaimer ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {proPhpDisclaimer}
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            More quotes, AI drafts, multiple forms, and advanced branding for growing operators.
          </p>

          <Button
            className="mt-6 w-full"
            disabled={isPending}
            onClick={() => handleSubscribe("pro")}
            size="lg"
            type="button"
          >
            {isPending && pendingPlan === "pro" ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Opening checkout…
              </>
            ) : (
              "Start with Pro"
            )}
          </Button>

          <ul className="mt-7 flex flex-col gap-2.5 border-t border-border/50 pt-6">
            <Feature>Unlimited quotes & follow-ups</Feature>
            <Feature>AI assistant — 100 generations / mo</Feature>
            <Feature>Workflow analytics</Feature>
            <Feature>5 inquiry forms, 5 businesses</Feature>
            <Feature>Page customization & branding</Feature>
            <Feature>Email templates & quote library</Feature>
            <Feature>Knowledge base (10 items)</Feature>
            <Feature>Data exports</Feature>
            <Feature>25 MB uploads</Feature>
          </ul>
        </div>

        {/* Business */}
        <div className="flex flex-col rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Business
          </p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="font-heading text-4xl font-semibold tracking-tight text-foreground">
              {businessPrice}
            </span>
            <span className="text-sm text-muted-foreground">/{period}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {businessMonthly
              ? `${businessMonthly} billed monthly`
              : "Cancel anytime"}
          </p>
          {businessPhpDisclaimer ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {businessPhpDisclaimer}
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Team roles, higher AI and email caps, audit logs, and priority support.
          </p>

          <Button
            className="mt-6 w-full"
            disabled={isPending}
            onClick={() => handleSubscribe("business")}
            size="lg"
            type="button"
            variant="outline"
          >
            {isPending && pendingPlan === "business" ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Opening checkout…
              </>
            ) : (
              "Start with Business"
            )}
          </Button>

          <ul className="mt-7 flex flex-col gap-2.5 border-t border-border/50 pt-6">
            <Feature>Everything in Pro</Feature>
            <Feature>Team members — up to 25</Feature>
            <Feature>500 AI generations / mo</Feature>
            <Feature>500 Requo email sends / mo</Feature>
            <Feature>Unlimited businesses & forms</Feature>
            <Feature>Knowledge base (50 items)</Feature>
            <Feature>Audit logs</Feature>
            <Feature>50 MB uploads</Feature>
            <Feature>Priority support</Feature>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[0.82rem] leading-relaxed text-foreground">
      <Check aria-hidden="true" className="mt-[3px] size-3.5 shrink-0 text-primary/80" />
      <span>{children}</span>
    </li>
  );
}
