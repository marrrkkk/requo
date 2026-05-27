"use client";

import { useState } from "react";

import { AnalyticsNavSelector } from "@/features/analytics/components/analytics-nav-selector";

type AnalyticsTab = "basic" | "advanced";

type AnalyticsTabbedDashboardProps = {
  basicContent: React.ReactNode;
  advancedContent: React.ReactNode;
  defaultTab?: AnalyticsTab;
  /** When false, the Advanced tab is hidden and only basic content is rendered. */
  canAccessAdvanced?: boolean;
};

export function AnalyticsTabbedDashboard({
  basicContent,
  advancedContent,
  defaultTab = "basic",
  canAccessAdvanced = true,
}: AnalyticsTabbedDashboardProps) {
  // Force basic when user can't access advanced, regardless of defaultTab.
  const initialTab: AnalyticsTab = canAccessAdvanced ? defaultTab : "basic";
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);

  function handleTabChange(tab: AnalyticsTab) {
    if (tab === activeTab) return;
    if (tab === "advanced" && !canAccessAdvanced) return;
    setActiveTab(tab);
  }

  const effectiveTab: AnalyticsTab = canAccessAdvanced ? activeTab : "basic";

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsNavSelector
        activeTab={effectiveTab}
        onTabChange={handleTabChange}
        canAccessAdvanced={canAccessAdvanced}
      />

      <div className={effectiveTab === "basic" ? "block" : "hidden"}>
        {basicContent}
      </div>
      {canAccessAdvanced ? (
        <div className={effectiveTab === "advanced" ? "block" : "hidden"}>
          {advancedContent}
        </div>
      ) : null}
    </div>
  );
}
