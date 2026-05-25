"use client";

import { useState } from "react";

import { AnalyticsNavSelector } from "@/features/analytics/components/analytics-nav-selector";

type AnalyticsTab = "basic" | "advanced";

type AnalyticsTabbedDashboardProps = {
  basicContent: React.ReactNode;
  advancedContent: React.ReactNode;
  defaultTab?: AnalyticsTab;
};

export function AnalyticsTabbedDashboard({
  basicContent,
  advancedContent,
  defaultTab = "basic",
}: AnalyticsTabbedDashboardProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(defaultTab);

  function handleTabChange(tab: AnalyticsTab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsNavSelector activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="rounded-xl bg-surface-default p-5 sm:p-6">
        <div className={activeTab === "basic" ? "block" : "hidden"}>
          {basicContent}
        </div>
        <div className={activeTab === "advanced" ? "block" : "hidden"}>
          {advancedContent}
        </div>
      </div>
    </div>
  );
}
