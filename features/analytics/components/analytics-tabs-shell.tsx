"use client";

import React, { useState, useTransition, useRef, type ReactNode } from "react";
import {
  BarChart3,
  GitCompareArrows,
  Timer,
  ChevronsUpDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyticsSections, type AnalyticsSectionId } from "@/features/analytics/config";
import { AnalyticsTabContentFallback } from "@/features/analytics/components/analytics-tab-content-fallback";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";

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
  const router = useProgressRouter();
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

  const activeTabItem =
    analyticsTabItems.find((item) => item.id === displayedTab) ?? analyticsTabItems[0];

  return (
    <Tabs
      className="flex flex-col gap-6"
      onValueChange={handleValueChange}
      value={displayedTab}
    >
      <AnalyticsMobileSelect
        activeItem={activeTabItem}
        onSelect={handleValueChange}
      />

      <div className="hidden sm:block">
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
      </div>

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

function AnalyticsMobileSelect({
  activeItem,
  onSelect,
}: {
  activeItem: typeof analyticsTabItems[number];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focusValue, setFocusValue] = useState(activeItem.label);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ActiveIcon = activeItem.icon;

  React.useEffect(() => {
    if (open) {
      setFocusValue(activeItem.label);
    }
  }, [open, activeItem.label]);

  return (
    <div className="sm:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <ActiveIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{activeItem.label}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="overlay-surface w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command value={focusValue} onValueChange={setFocusValue}>
            <CommandList>
              <CommandGroup>
                {analyticsTabItems.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.id === activeItem.id;

                  return (
                    <CommandItem
                      key={tab.id}
                      onSelect={() => {
                        onSelect(tab.id);
                        setOpen(false);
                      }}
                      className={cn(isActive && "font-medium text-primary data-[selected=true]:text-primary")}
                      value={tab.label}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      {tab.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
