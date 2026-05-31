"use client";

import { useState } from "react";

import Link from "next/link";
import { LayoutTemplate, Plus, GitBranch, Zap, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { useProgressiveReveal } from "@/hooks/use-progressive-reveal";
import type { MotionState } from "@/hooks/use-animated-list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  DashboardPage,
  DashboardEmptyState,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import type { AutomationListItem, AutomationStats } from "../../queries";
import {
  getRecommendedAutomations,
  getAutomationValueProp,
} from "../../recommended-automations";
import { RecommendedAutomationsCard } from "../recommended-automations-card";
import { AutomationStatsBar } from "../automation-stats-bar";

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
  businessType,
  stats,
  getMotionState,
  onNew,
  onEdit,
  onDelete,
}: {
  automations: AutomationListItem[];
  businessSlug: string;
  businessType?: string;
  stats?: AutomationStats;
  getMotionState?: (id: string) => MotionState;
  onNew: () => void;
  onEdit: (a: AutomationListItem) => void;
  onDelete: (id: string) => void;
}) {
  const [automationToDelete, setAutomationToDelete] = useState<AutomationListItem | null>(null);
  const { visibleCount, hasMore, sentinelRef } = useProgressiveReveal({
    total: automations.length,
    initialBatch: 10,
    batchSize: 10,
  });
  const visibleAutomations = automations.slice(0, visibleCount);

  if (automations.length === 0) {
    const recommendations = getRecommendedAutomations(businessType);
    const valueProp = getAutomationValueProp(businessType);

    return (
      <DashboardPage>
        <PageHeader
          title="Automations"
          description="Event-driven rules that automate your workflow."
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
          <DashboardEmptyState
            variant="section"
            icon={GitBranch}
            title="No workflows yet"
            description="Automations handle repeat tasks so you can focus on the work. Start with a recommendation or build your own."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" onClick={onNew}>
                  <Plus data-icon="inline-start" className="size-3.5" />
                  Build from scratch
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${businessSlug}/automations/presets`}>
                    <LayoutTemplate data-icon="inline-start" className="size-3.5" />
                    Browse all templates
                  </Link>
                </Button>
              </div>
            }
          />
          {recommendations.length > 0 && (
            <div className="w-full max-w-lg">
              <RecommendedAutomationsCard
                recommendations={recommendations}
                valueProp={valueProp}
                existingAutomationNames={[]}
              />
            </div>
          )}
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <PageHeader
        title="Automations"
        description="Event-driven rules that automate your workflow."
        actions={
          <Button onClick={onNew}>
            <Plus data-icon="inline-start" />
            New workflow
          </Button>
        }
      />

      {/* Stats bar */}
      {stats && stats.totalExecutions > 0 && (
        <div className="mb-2">
          <AutomationStatsBar stats={stats} />
        </div>
      )}

      {/* Automation rows */}
      <DashboardTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18rem]">Workflow</TableHead>
              <TableHead className="w-[12rem]">Trigger</TableHead>
              <TableHead className="w-[10rem]">Status</TableHead>
              <TableHead className="w-[10rem]">Last Run</TableHead>
              <TableHead className="w-[3rem]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAutomations.map((automation) => {
              const TriggerIcon = triggers.find((t) => t.id === automation.triggerType)?.icon ?? Zap;
              const triggerLabel = triggerLabels[automation.triggerType] ?? automation.triggerType;
              const actionCount = countActions(automation.actions);
              const lastRun = automation.lastTriggeredAt
                ? formatRelativeTime(automation.lastTriggeredAt)
                : null;

              return (
                <TableRow
                  className="motion-list-item group/row cursor-pointer"
                  data-motion-state={getMotionState?.(automation.id)}
                  key={automation.id}
                  onClick={() => onEdit(automation)}
                >
                  <TableCell className="w-[18rem]">
                    <div className="table-meta-stack max-w-full">
                      <span className="table-link text-foreground font-medium">
                        {automation.name}
                      </span>
                      <span className="table-supporting-text">
                        {actionCount} action{actionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[12rem]">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TriggerIcon className="size-4 shrink-0 text-muted-foreground/70" />
                      {triggerLabel}
                    </div>
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    <Badge
                      className={`w-fit shrink-0 ${
                        automation.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                          : "border-border bg-muted text-muted-foreground hover:bg-muted"
                      }`}
                      variant="outline"
                    >
                      {automation.enabled ? "Active" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    <span className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
                      {lastRun || "Never"}
                    </span>
                  </TableCell>
                  <TableCell className="w-[3rem]">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(automation); }}>
                          <PencilLine data-icon="inline-start" className="size-4" />
                          Edit workflow
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutomationToDelete(automation);
                          }}
                        >
                          <Trash2 data-icon="inline-start" className="size-4" />
                          Delete workflow
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DashboardTableContainer>
      {hasMore ? <div ref={sentinelRef} className="h-1" /> : null}

      <AlertDialog open={!!automationToDelete} onOpenChange={(open) => !open && setAutomationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{automationToDelete?.name}</strong> workflow. It will no longer execute when its trigger event occurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  if (automationToDelete) {
                    onDelete(automationToDelete.id);
                    setAutomationToDelete(null);
                  }
                }}
              >
                Delete workflow
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPage>
  );
}
