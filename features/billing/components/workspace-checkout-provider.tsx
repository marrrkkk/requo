"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { PlanSelectionSheet } from "@/features/billing/components/plan-selection-sheet";
import { startDodoCheckout } from "@/features/billing/start-checkout";
import type { AccountBillingOverview } from "@/features/billing/types";
import { getBusinessDashboardPath } from "@/features/businesses/routes";
import type { BillingInterval, PaidPlan } from "@/lib/billing/types";
import type { BusinessPlan as plan } from "@/lib/plans/plans";

type BusinessCheckoutContextValue = {
  currentPlan: plan;
  defaultCurrency: AccountBillingOverview["defaultCurrency"];
  region: AccountBillingOverview["region"];
  userId: string;
  businessId: string;
  businessSlug: string;
  isStartingCheckout: boolean;
  openPlanSelection: (targetPlan?: PaidPlan) => void;
  openCheckout: (plan: PaidPlan, interval?: BillingInterval) => void;
};

const BusinessCheckoutContext =
  createContext<BusinessCheckoutContextValue | null>(null);

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
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false);
  const [sheetTargetPlan, setSheetTargetPlan] = useState<PaidPlan | undefined>(
    undefined,
  );
  const [isStartingCheckout, startTransition] = useTransition();

  const openCheckout = useCallback(
    (plan: PaidPlan, interval: BillingInterval = "monthly") => {
      const returnTo = billing.businessSlug
        ? getBusinessDashboardPath(billing.businessSlug)
        : undefined;

      startTransition(async () => {
        const result = await startDodoCheckout({ plan, interval, returnTo });
        if (result.ok) {
          // Checkout opened in a new tab (or same-tab fallback).
          // Either way we don't need to do anything further here.
          return;
        }

        if (result.reason === "already_subscribed") {
          toast.info(result.message);
          return;
        }

        toast.error(result.message);
      });
    },
    [billing.businessSlug],
  );

  const openPlanSelection = useCallback((targetPlan?: PaidPlan) => {
    setSheetTargetPlan(targetPlan);
    setIsPlanSheetOpen(true);
  }, []);

  const value = useMemo<BusinessCheckoutContextValue>(
    () => ({
      businessId: billing.businessId,
      businessSlug: billing.businessSlug,
      currentPlan: billing.currentPlan,
      defaultCurrency: billing.defaultCurrency,
      isStartingCheckout,
      openCheckout,
      openPlanSelection,
      region: billing.region,
      userId: billing.userId,
    }),
    [billing, isStartingCheckout, openCheckout, openPlanSelection],
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
