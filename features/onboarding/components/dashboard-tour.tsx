"use client";

import { completeDashboardTourAction } from "@/features/onboarding/tour-actions";
import {
  BusinessSwitcherPreview,
  FollowUpsPreview,
  InquiriesPreview,
  QuotesPreview,
  TourModal,
  type TourModalStep,
} from "@/features/onboarding/components/tour-modal";

const tourSteps: TourModalStep[] = [
  {
    title: "Your business at a glance",
    description:
      "This is your active business. Switch between businesses or manage settings from the sidebar.",
    preview: <BusinessSwitcherPreview />,
  },
  {
    title: "Inquiries land here",
    description:
      "Every inquiry — from your public form, email, or manual entry — shows up in one list.",
    preview: <InquiriesPreview />,
  },
  {
    title: "Build and send quotes",
    description:
      "Draft a clear quote, attach line items, and share a link your customer can respond to.",
    preview: <QuotesPreview />,
  },
  {
    title: "Never miss a follow-up",
    description:
      "See which quotes need a nudge and which inquiries are waiting. Schedule reminders so nothing slips.",
    preview: <FollowUpsPreview />,
  },
];

/**
 * Dashboard tour as a modal with preview UI.
 * Shows automatically the first time a user opens any new business dashboard.
 */
export function DashboardTour({ businessId }: { businessId: string }) {
  return (
    <TourModal
      onComplete={completeDashboardTourAction}
      show
      steps={tourSteps}
      storageKey={`requo:tour:dashboard:${businessId}`}
    />
  );
}
