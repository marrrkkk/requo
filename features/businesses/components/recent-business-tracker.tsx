"use client";

import { useEffect } from "react";
import { recordBusinessOpen } from "@/features/businesses/recently-opened";

type RecentBusinessTrackerProps = {
  userId: string;
  businessSlug: string;
  businessName: string;
  logoStoragePath: string | null;
  defaultCurrency: string;
  workspaceSlug: string;
  workspaceName: string;
  businessType: string;
};

/**
 * Invisible component that records a business visit in localStorage.
 * Mount once inside the dashboard layout so every business open is tracked.
 */
export function RecentBusinessTracker({
  userId,
  businessSlug,
  businessName,
  logoStoragePath,
  defaultCurrency,
  workspaceSlug,
  workspaceName,
  businessType,
}: RecentBusinessTrackerProps) {
  useEffect(() => {
    recordBusinessOpen(userId, {
      slug: businessSlug,
      name: businessName,
      logoStoragePath,
      defaultCurrency,
      workspaceSlug,
      workspaceName,
      businessType,
    });
  }, [userId, businessSlug, businessName, logoStoragePath, defaultCurrency, workspaceSlug, workspaceName, businessType]);

  return null;
}
