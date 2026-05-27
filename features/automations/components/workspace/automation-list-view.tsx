"use client";

import Link from "next/link";
import { LayoutTemplate, Plus, GitBranch, Zap } from "lucide-react";
import { useProgressiveReveal } from "@/hooks/use-progressive-reveal";

import { Button } from "@/components/ui/button";
import {
  DashboardEmptyState,
} from "@/components/shared/dashboard-layout";
import { cn } from "@/lib/utils";
import type { AutomationListItem } from "../../queries";

import { triggers, triggerLabels } from "./definitions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const d = new Date(date);
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Count action nodes from an automation's actions field */
function countActions(actions: unknown): number {
  if (Array.isArray(actions)) return actions.length;
  if (actions && typeof actions === "object" && "nodes" in actions) {
    const graph = actions as { nodes: Array<{ type: string }> };
    if (Array.isArray(graph.nodes)) {
      return graph.nodes.filter((n) => n.type === "action").length;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutomationListView({
  automations,
  businessSlug,
  onNew,
  onEdit,
}: {
  automations: AutomationListItem[];
  businessSlug: string;
  onNew: () => void;
  onEdit: (a: AutomationListItem) => void;
}) {
  const { visibleCount, hasMore, sentinelRef } = useProgressiveReveal({
    total: automations.length,
    initialBatch: 10,
    batchSize: 10,
  });
  const visibleAutomations = automations.slice(0, visibleCount);

  if (automations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12">
        <DashboardEmptyState
          variant="section"
          icon={GitBranch}
          title="No workflows yet"
          description="Add a workflow from a template or build one from scratch."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={onNew}>
                <Plus className="size-3.5" />
                Build from scratch
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/${businessSlug}/automations/presets`}>
                  <LayoutTemplate className="size-3.5" />
                  Browse templates
                </Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold">Automations</h1>
          <p className="text-xs text-muted-foreground">
            {automations.length} workflow{automations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={onNew}>
          <Plus className="size-3.5" />
          New workflow
        </Button>
      </div>

      {/* Automation rows */}
      <div className="flex flex-col divide-y divide-border/60">
        {visibleAutomations.map((automation) => {
          const TriggerIcon = triggers.find((t) => t.id === automation.triggerType)?.icon ?? Zap;
          const triggerLabel = triggerLabels[automation.triggerType] ?? automation.triggerType;
          const actionCount = countActions(automation.actions);
          const lastRun = automation.lastTriggeredAt
            ? formatRelativeTime(automation.lastTriggeredAt)
            : null;

          return (
            <button
              key={automation.id}
              type="button"
              onClick={() => onEdit(automation)}
              className="group flex items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/30"
            >
              {/* Icon */}
              <div className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                automation.enabled
                  ? "border-primary/20 bg-primary/[0.06] text-primary"
                  : "border-border bg-muted/50 text-muted-foreground",
              )}>
                <TriggerIcon className="size-4" />
              </div>

              {/* Main content */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {automation.name}
                  </span>
                  {!automation.enabled && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Draft
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{triggerLabel}</span>
                  {actionCount > 0 && (
                    <>
                      <span className="text-border">{"→"}</span>
                      <span>{actionCount} action{actionCount !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right side: status + last run */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "size-1.5 rounded-full",
                    automation.enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    automation.enabled ? "text-emerald-600" : "text-muted-foreground",
                  )}>
                    {automation.enabled ? "Active" : "Inactive"}
                  </span>
                </div>
                {lastRun && (
                  <span className="text-[11px] text-muted-foreground" suppressHydrationWarning>
                    Last run {lastRun}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {hasMore ? <div ref={sentinelRef} className="h-1" /> : null}
      </div>
    </div>
  );
}
