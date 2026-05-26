"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { Clock, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

function formatRunDuration(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function summarizeActions(actionsExecuted: unknown): string {
  if (!Array.isArray(actionsExecuted) || actionsExecuted.length === 0) return "No actions";
  const types = actionsExecuted
    .map((a: unknown) => {
      if (typeof a === "object" && a !== null && "type" in a) {
        return String((a as { type: string }).type).replace(/_/g, " ");
      }
      return null;
    })
    .filter(Boolean);
  if (types.length === 0) return `${actionsExecuted.length} action${actionsExecuted.length > 1 ? "s" : ""}`;
  if (types.length === 1) return types[0]!;
  return `${types[0]} +${types.length - 1}`;
}

const statusMeta: Record<string, { label: string; dotClass: string; rowClass: string }> = {
  success: { label: "Completed", dotClass: "bg-emerald-500", rowClass: "" },
  partial_failure: { label: "Partial failure", dotClass: "bg-amber-500", rowClass: "border-amber-500/20 bg-amber-500/[0.03]" },
  failure: { label: "Failed", dotClass: "bg-destructive", rowClass: "border-destructive/20 bg-destructive/[0.03]" },
};

// ---------------------------------------------------------------------------
// Runs Tab Content
// ---------------------------------------------------------------------------

export type RunsTabContentProps = {
  automationId: string | null;
  businessSlug: string;
};

export function RunsTabContent({ automationId }: RunsTabContentProps) {
  const [entries, setEntries] = useState<Array<{
    id: string;
    triggerType: string;
    triggerPayload: unknown;
    actionsExecuted: unknown;
    status: string;
    durationMs: number;
    error: string | null;
    createdAt: Date;
  }>>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "partial_failure" | "failure">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const PAGE_SIZE = 20;

  const loadRuns = useCallback(
    (filter: typeof statusFilter, newOffset: number) => {
      if (!automationId) return;
      startTransition(async () => {
        const { fetchAutomationRuns } = await import("../../mutations");
        const result = await fetchAutomationRuns(automationId, {
          status: filter === "all" ? undefined : filter,
          limit: PAGE_SIZE,
          offset: newOffset,
        });
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setEntries(result.entries);
        setTotal(result.total);
      });
    },
    [automationId, startTransition],
  );

  useEffect(() => {
    loadRuns(statusFilter, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationId]);

  if (!automationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">Save to see runs</h3>
          <p className="max-w-xs text-xs text-muted-foreground">
            Save this workflow first to view its execution history.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const filterOptions: { value: typeof statusFilter; label: string; count?: number }[] = [
    { value: "all", label: "All" },
    { value: "success", label: "Completed" },
    { value: "partial_failure", label: "Partial" },
    { value: "failure", label: "Failed" },
  ];

  if (entries.length === 0 && !isLoading && statusFilter === "all") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
            <Play className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">No runs yet</h3>
          <p className="max-w-xs text-xs text-muted-foreground">
            Execution history will appear here once this workflow is triggered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === opt.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            onClick={() => {
              setStatusFilter(opt.value);
              setOffset(0);
              loadRuns(opt.value, 0);
            }}
            aria-pressed={statusFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {total} run{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Entries list */}
      <div className="flex flex-1 flex-col gap-0 overflow-y-auto">
        {entries.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-muted-foreground">No runs match this filter.</p>
          </div>
        )}
        {entries.map((entry) => {
          const meta = statusMeta[entry.status] ?? statusMeta.failure;
          const isExpanded = expandedId === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className={cn(
                "group flex w-full flex-col border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                meta.rowClass,
              )}
            >
              <div className="flex items-center gap-3">
                {/* Status dot */}
                <span
                  className={cn("size-2 shrink-0 rounded-full", meta.dotClass)}
                  aria-label={meta.label}
                />
                {/* Main content */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {summarizeActions(entry.actionsExecuted)}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRunDuration(entry.durationMs)}
                  </span>
                </div>
                {/* Time */}
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground" suppressHydrationWarning>
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-2 flex flex-col gap-1.5 pl-5">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium">Trigger:</span>
                    <span>{entry.triggerType.replace(".", " → ")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium">Status:</span>
                    <span className={cn(
                      entry.status === "success" && "text-emerald-600",
                      entry.status === "partial_failure" && "text-amber-600",
                      entry.status === "failure" && "text-destructive",
                    )}>
                      {meta.label}
                    </span>
                  </div>
                  {entry.error && (
                    <div className="mt-1 rounded-md bg-destructive/[0.06] px-2.5 py-1.5 text-[11px] leading-relaxed text-destructive">
                      {entry.error}
                    </div>
                  )}
                  {Array.isArray(entry.actionsExecuted) && entry.actionsExecuted.length > 1 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {entry.actionsExecuted.map((action: unknown, i: number) => {
                        const a = action as { type?: string; success?: boolean; error?: string };
                        return (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className={cn(
                              "size-1.5 rounded-full",
                              a.success ? "bg-emerald-500" : "bg-destructive",
                            )} />
                            <span className="text-muted-foreground">
                              {a.type?.replace(/_/g, " ") ?? `Action ${i + 1}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2.5">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {currentPage}/{totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                const newOffset = Math.max(0, offset - PAGE_SIZE);
                setOffset(newOffset);
                loadRuns(statusFilter, newOffset);
              }}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => {
                const newOffset = offset + PAGE_SIZE;
                setOffset(newOffset);
                loadRuns(statusFilter, newOffset);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
