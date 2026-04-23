"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  BarChart3,
  GitCompareArrows,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyticsSections, type AnalyticsSectionId } from "@/features/analytics/config";
import { AnalyticsTabContentFallback } from "@/features/analytics/components/analytics-tab-content-fallback";

const analyticsTabItems = [
  {
    id: analyticsSections.overview.id,
    label: analyticsSections.overview.label,
    icon: BarChart3,
  },
  {
    id: analyticsSections.conversion.id,
    label: analyticsSections.conversion.label,
    icon: GitCompareArrows,
  },
  {
    id: analyticsSections.workflow.id,
    label: analyticsSections.workflow.label,
    icon: Timer,
  },
] as const;

type AnalyticsTabsShellProps = {
  activeTab: AnalyticsSectionId;
  pathname: string;
  children: ReactNode;
};

function getAnalyticsTab(value: string | null | undefined): AnalyticsSectionId {
  return analyticsTabItems.some((item) => item.id === value)
    ? (value as AnalyticsSectionId)
    : analyticsSections.overview.id;
}

function getNextTabUrl(
  pathname: string,
  currentSearch: string,
  nextTab: AnalyticsSectionId,
) {
  const params = new URLSearchParams(currentSearch);
  params.set("tab", nextTab);

  return `${pathname}?${params.toString()}`;
}

export function AnalyticsTabsShell({
  activeTab,
  pathname,
  children,
}: AnalyticsTabsShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestedTab, setRequestedTab] = useState<AnalyticsSectionId | null>(null);

  const displayedTab =
    isPending && requestedTab !== null ? requestedTab : activeTab;
  const showFallback =
    isPending && requestedTab !== null && requestedTab !== activeTab;

  function handleValueChange(nextValue: string) {
    const nextTab = getAnalyticsTab(nextValue);

    if (nextTab === displayedTab) {
      return;
    }

    setRequestedTab(nextTab);

    startTransition(() => {
      router.push(getNextTabUrl(pathname, window.location.search, nextTab), {
        scroll: false,
      });
    });
  }

  return (
    <Tabs
      className="flex flex-col gap-6"
      onValueChange={handleValueChange}
      value={displayedTab}
    >
      <TabsList>
        {analyticsTabItems.map((tab) => {
          const Icon = tab.icon;

          return (
            <TabsTrigger key={tab.id} value={tab.id}>
              <Icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent forceMount value={displayedTab}>
        {showFallback ? (
          <AnalyticsTabContentFallback activeTab={displayedTab} />
        ) : (
          children
        )}
      </TabsContent>
    </Tabs>
  );
}
