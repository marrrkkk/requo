"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/select";

type AnalyticsTab = "basic" | "advanced";

type AnalyticsNavSelectorProps = {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
};

const TAB_OPTIONS: { value: AnalyticsTab; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
];

export function AnalyticsNavSelector({
  activeTab,
  onTabChange,
}: AnalyticsNavSelectorProps) {
  return (
    <div className="bg-section-panel rounded-lg p-1">
      {/* Desktop: Tabs (≥ 640px) */}
      <div className="hidden sm:flex">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as AnalyticsTab)}
        >
          <TabsList>
            {TAB_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className={
                  activeTab === option.value
                    ? "bg-control-active text-control-active-foreground"
                    : "bg-surface-muted text-meta-label"
                }
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile: Select (< 640px) */}
      <div className="flex sm:hidden">
        <SelectRoot
          value={activeTab}
          onValueChange={(value) => onTabChange(value as AnalyticsTab)}
        >
          <SelectTrigger className="w-full bg-surface-muted text-meta-label data-[state=open]:bg-control-active data-[state=open]:text-control-active-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAB_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </div>
    </div>
  );
}
