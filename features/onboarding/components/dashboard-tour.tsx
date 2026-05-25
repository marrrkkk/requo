"use client";

import { useCallback, useEffect, useState } from "react";

import { completeDashboardTourAction } from "@/features/onboarding/tour-actions";
import {
  AutomationsPreview,
  FollowUpsPreview,
  FormsPreview,
  HomeOverviewPreview,
  InquiriesPreview,
  InvoicesPreview,
  JobsPreview,
  QuotesPreview,
  TourModal,
  type TourModalStep,
} from "@/features/onboarding/components/tour-modal";
import {
  clearDashboardTourLocalStorage,
  DASHBOARD_TOUR_DEV_SHOW_EVENT,
  getDashboardTourStorageKey,
} from "@/features/onboarding/tour-keys";

const tourSteps: TourModalStep[] = [
  {
    title: "Your home base",
    description:
      "See what needs attention today, switch businesses from the sidebar, and ask Requo to draft follow-ups or summarize inquiries.",
    preview: <HomeOverviewPreview />,
  },
  {
    title: "Capture every inquiry",
    description:
      "Public forms, manual entry, and email intake land in one list — qualify and turn the best leads into quotes.",
    preview: <InquiriesPreview />,
  },
  {
    title: "Send professional quotes",
    description:
      "Build line-item quotes, share a customer link, and track viewed, accepted, and expired responses.",
    preview: <QuotesPreview />,
  },
  {
    title: "Stay on top of follow-ups",
    description:
      "Schedule reminders when quotes go quiet or inquiries need a reply so nothing slips after you send.",
    preview: <FollowUpsPreview />,
  },
  {
    title: "Run the job",
    description:
      "When a quote is accepted, create a job to track delivery from start to finish.",
    preview: <JobsPreview />,
  },
  {
    title: "Invoice and get paid",
    description:
      "Generate invoices from completed work, send them to customers, and track sent and paid status.",
    preview: <InvoicesPreview />,
  },
  {
    title: "Automate repeat work",
    description:
      "Set rules for quote viewed, accepted, and more — follow-ups and status updates run on their own.",
    preview: <AutomationsPreview />,
  },
  {
    title: "Publish inquiry forms",
    description:
      "Customize fields and your public page, then share one link for new leads.",
    preview: <FormsPreview />,
  },
];

type DashboardTourProps = {
  businessId: string;
  completed: boolean;
};

/**
 * Product tour for the business home dashboard.
 * Shown once per business membership; completion is stored on `business_members`.
 */
export function DashboardTour({ businessId, completed }: DashboardTourProps) {
  const [replayToken, setReplayToken] = useState(0);
  const storageKey = getDashboardTourStorageKey(businessId);

  useEffect(() => {
    const handleDevShow = () => {
      clearDashboardTourLocalStorage(businessId);
      setReplayToken((value) => value + 1);
    };

    window.addEventListener(DASHBOARD_TOUR_DEV_SHOW_EVENT, handleDevShow);

    try {
      if (sessionStorage.getItem("requo:dev:pending-dashboard-tour") === businessId) {
        sessionStorage.removeItem("requo:dev:pending-dashboard-tour");
        handleDevShow();
      }
    } catch {
      // sessionStorage unavailable
    }

    return () => {
      window.removeEventListener(DASHBOARD_TOUR_DEV_SHOW_EVENT, handleDevShow);
    };
  }, [businessId]);

  const handleComplete = useCallback(async () => {
    await completeDashboardTourAction(businessId);
  }, [businessId]);

  return (
    <TourModal
      completed={completed}
      onComplete={handleComplete}
      replayToken={replayToken}
      show
      steps={tourSteps}
      storageKey={storageKey}
    />
  );
}
