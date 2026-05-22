"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  FileText,
  Inbox,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NeedsAttentionIconName = "inbox" | "file-text" | "bell-ring" | "check-circle";

type NeedsAttentionBadgeData =
  | { kind: "inquiry"; status: string }
  | { kind: "quote"; status: string }
  | { kind: "reminder"; reminderKind: string };

export type NeedsAttentionItemData = {
  href: string;
  key: string;
  label: string;
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  tone: "urgent" | "normal" | "positive";
  iconName: NeedsAttentionIconName;
  badge?: NeedsAttentionBadgeData;
  category: "Inquiry" | "Quote" | "Follow-up";
};

type CategoryFilter = "all" | "Inquiry" | "Quote" | "Follow-up";

const iconMap: Record<NeedsAttentionIconName, LucideIcon> = {
  "inbox": Inbox,
  "file-text": FileText,
  "bell-ring": BellRing,
  "check-circle": CheckCircle2,
};

const categoryFilters: { label: string; value: CategoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Inquiries", value: "Inquiry" },
  { label: "Quotes", value: "Quote" },
  { label: "Follow-ups", value: "Follow-up" },
];

export function NeedsAttentionTabs({
  items,
}: {
  items: NeedsAttentionItemData[];
}) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(
    () =>
      activeFilter === "all"
        ? items
        : items.filter((item) => item.category === activeFilter),
    [items, activeFilter],
  );

  const visibleFilters = categoryFilters.filter(
    (f) => f.value === "all" || (categoryCounts[f.value] ?? 0) > 0,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Category filter tabs */}
      <div className="flex flex-wrap items-center gap-2 px-1 sm:px-2">
        {visibleFilters.map((filter) => (
          <Button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            size="sm"
            type="button"
            variant={activeFilter === filter.value ? "secondary" : "ghost"}
            className={cn(
              "h-8 gap-1.5 text-xs",
              activeFilter === filter.value && "font-semibold",
            )}
          >
            {filter.label}
            {(categoryCounts[filter.value] ?? 0) > 0 ? (
              <Badge
                variant="outline"
                className="ml-0.5 h-5 min-w-5 px-1.5 text-[0.65rem]"
              >
                {categoryCounts[filter.value]}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      {/* Filtered items */}
      <div className="flex flex-col divide-y divide-border/70">
        {filteredItems.length ? (
          filteredItems.slice(0, 6).map((item) => (
            <NeedsAttentionFilteredRow item={item} key={item.key} />
          ))
        ) : (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No items in this category.
          </p>
        )}
      </div>

      {filteredItems.length > 6 ? (
        <p className="px-2 text-center text-xs text-muted-foreground">
          +{filteredItems.length - 6} more — view the full list from the relevant section.
        </p>
      ) : null}
    </div>
  );
}

function NeedsAttentionFilteredRow({ item }: { item: NeedsAttentionItemData }) {
  const Icon = iconMap[item.iconName];

  return (
    <Link
      className="group flex items-center gap-4 px-1 py-3.5 transition-colors hover:bg-accent/22 sm:px-2"
      href={item.href}
      prefetch={true}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          item.tone === "urgent" && "bg-destructive/10 text-destructive",
          item.tone === "normal" && "bg-primary/10 text-primary",
          item.tone === "positive" && "bg-green-500/10 text-green-600 dark:text-green-400",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground/70">
                {item.category}
              </span>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.meta}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
