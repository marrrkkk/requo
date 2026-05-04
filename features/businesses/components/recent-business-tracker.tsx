"use client";

import { useEffect } from "react";

import { recordRecentlyOpenedBusinessAction } from "@/features/businesses/actions";

type RecentBusinessTrackerProps = {
  businessSlug: string;
};

/**
 * Invisible component that records a business visit for the signed-in account.
 * Mount once inside the dashboard layout so every business open is tracked.
 */
export function RecentBusinessTracker({
  businessSlug,
}: RecentBusinessTrackerProps) {
  useEffect(() => {
    void recordRecentlyOpenedBusinessAction(businessSlug);
  }, [businessSlug]);

  return null;
}
