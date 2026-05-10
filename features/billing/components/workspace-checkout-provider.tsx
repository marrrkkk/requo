"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import type { AccountBillingOverview } from "@/features/billing/types";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

type PersistedPendingCheckout = null;

type BusinessCheckoutContextValue = {
  currentPlan: plan;
  defaultCurrency: AccountBillingOverview["defaultCurrency"];
  pendingCheckout: PersistedPendingCheckout;
  region: AccountBillingOverview["region"];
  userId: string;
  businessId: string;
  businessSlug: string;
  openPlanSelection: (targetPlan?: PaidPlan) => void;
  openCheckout: (plan: PaidPlan, interval?: BillingInterval) => void;
  continueCheckout: () => void;
};

const BusinessCheckoutContext =
  createContext<BusinessCheckoutContextValue | null>(null);

function getDefaultUpgradePlan(currentPlan: plan): PaidPlan {
  return currentPlan === "pro" ? "business" : "pro";
}

function buildCheckoutHref(plan: PaidPlan, interval: BillingInterval = "monthly") {
  const params = new URLSearchParams({
    interval,
    plan,
  });
  return `/account/billing/checkout?${params.toString()}`;
}

export function useBusinessCheckout() {
  return useContext(BusinessCheckoutContext);
}

export function BusinessCheckoutProvider({
  billing,
  children,
}: {
  billing: AccountBillingOverview;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [sheetTargetPlan, setSheetTargetPlan] = useState<PaidPlan | undefined>(
    undefined,
  );

  const openCheckout = useCallback(
    (plan: PaidPlan, interval: BillingInterval = "monthly") => {
      router.push(buildCheckoutHref(plan, interval));
    },
    [router],
  );

  const openPlanSelection = useCallback((targetPlan?: PaidPlan) => {
    setSheetTargetPlan(targetPlan);
    setIsPlanSheetOpen(true);
  }, []);

  const continueCheckout = useCallback(() => {
    openPlanSelection(getDefaultUpgradePlan(billing.currentPlan));
  }, [billing.currentPlan, openPlanSelection]);

  const value = useMemo<BusinessCheckoutContextValue>(
    () => ({
      businessId: billing.businessId,
      businessSlug: billing.businessSlug,
      continueCheckout,
      currentPlan: billing.currentPlan,
      defaultCurrency: billing.defaultCurrency,
      openCheckout,
      openPlanSelection,
      pendingCheckout: null,
      region: billing.region,
      userId: billing.userId,
    }),
    [billing, continueCheckout, openCheckout, openPlanSelection],
  );

  return (
    <>
      <BusinessCheckoutContext.Provider value={value}>
        {children}
      </BusinessCheckoutContext.Provider>
      <PlanSelectionSheet
        currentPlan={billing.currentPlan}
        defaultCurrency={billing.defaultCurrency}
        onOpenChange={setIsPlanSheetOpen}
        onSelectPlan={(plan, interval) => {
          setIsPlanSheetOpen(false);
          openCheckout(plan, interval);
        }}
        open={isPlanSheetOpen}
        region={billing.region}
        targetPlan={sheetTargetPlan}
      />
    </>
  );
}
