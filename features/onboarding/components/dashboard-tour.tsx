"use client";

import { completeDashboardTourAction } from "@/features/onboarding/tour-actions";
import { GuidedTour, type TourStep } from "@/features/onboarding/components/guided-tour";

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour="business-switcher"]',
    title: "Your business at a glance",
    description:
      "This is your active business. Switch between businesses or manage settings from here.",
    side: "right",
  },
  {
    selector: '[data-tour="nav-inquiries"]',
    title: "Inquiries land here",
    description:
      "Every inquiry — from your public form, email, or manual entry — shows up in one list.",
    side: "right",
  },
  {
    selector: '[data-tour="nav-quotes"]',
    title: "Build and send quotes",
    description:
      "Draft a clear quote, attach line items, and share a link your customer can respond to.",
    side: "right",
  },
  {
    selector: '[data-tour="nav-follow-ups"]',
    title: "Never miss a follow-up",
    description:
      "See which quotes need a nudge and which inquiries are waiting. Schedule reminders so nothing slips.",
    side: "right",
  },
];

/**
 * Dashboard tour scoped per-business via localStorage.
 * Shows automatically the first time a user opens any new business dashboard.
 */
export function DashboardTour({ businessId }: { businessId: string }) {
  return (
    <GuidedTour
      onComplete={completeDashboardTourAction}
      show
      steps={tourSteps}
      storageKey={`requo:tour:dashboard:${businessId}`}
    />
  );
}
