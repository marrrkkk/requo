"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { MobileTabsCombobox } from "@/components/shared/mobile-tabs-combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AnalyticsTab = "basic" | "advanced";

type AnalyticsTabsShellProps = {
  basicContent: React.ReactNode;
  advancedContent: React.ReactNode;
  defaultTab?: AnalyticsTab;
  /** When false, the Advanced tab is hidden and only basic content is rendered. */
  canAccessAdvanced?: boolean;
};

const analyticsTabs = [
  {
    id: "basic" as const,
    label: "Overview",
    icon: BarChart3,
  },
  {
    id: "advanced" as const,
    label: "Advanced",
    icon: TrendingUp,
  },
];

function isAnalyticsTab(value: string | null): value is AnalyticsTab {
  return value === "basic" || value === "advanced";
}

function getAnalyticsTabValue(
  searchParams: URLSearchParams | null,
  defaultTab: AnalyticsTab,
  canAccessAdvanced: boolean,
): AnalyticsTab {
  if (!searchParams) return defaultTab;
  const tab = searchParams.get("tab");
  if (!isAnalyticsTab(tab)) return defaultTab;
  // Force basic if user can't access advanced
  if (tab === "advanced" && !canAccessAdvanced) return "basic";
  return tab;
}

export function AnalyticsTabsShell({
  basicContent,
  advancedContent,
  defaultTab = "basic",
  canAccessAdvanced = true,
}: AnalyticsTabsShellProps) {
  const searchParams = useSearchParams();
  const activeTab = getAnalyticsTabValue(searchParams, defaultTab, canAccessAdvanced);

  const visibleTabs = canAccessAdvanced
    ? analyticsTabs
    : analyticsTabs.filter((t) => t.id === "basic");

  return (
    <Tabs className="flex flex-col gap-5" value={activeTab}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Mobile: combobox dropdown */}
        <MobileTabsCombobox
          groups={[
            {
              items: visibleTabs.map((t) => ({
                label: t.label,
                value: t.id,
                icon: t.icon,
              })),
            },
          ]}
          activeValue={activeTab}
          onValueChange={(val) => {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", val);
            window.history.pushState({}, "", url);
          }}
        />

        {/* Desktop: horizontal tabs */}
        <TabsList className="hidden sm:inline-flex">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab.id);
                  window.history.pushState({}, "", url);
                }}
              >
                <Icon className="size-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <div className="min-w-0">
        <TabsContent
          className={activeTab === "basic" ? undefined : "hidden"}
          forceMount
          value="basic"
        >
          {basicContent}
        </TabsContent>

        {canAccessAdvanced && (
          <TabsContent
            className={activeTab === "advanced" ? undefined : "hidden"}
            forceMount
            value="advanced"
          >
            {advancedContent}
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
