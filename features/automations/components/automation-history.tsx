"use client";

import { useCallback, useState, useTransition } from "react";
import { Clock, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardEmptyState,
  DashboardSection,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type {
  AutomationHistoryEntry,
  AutomationHistoryFilters,
} from "../queries";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "success" | "partial_failure" | "failure";

type AutomationHistoryProps = {
  automationId: string;
  businessId: string;
  /** Server-fetched initial data to avoid a loading state on first render. */
  initialEntries?: AutomationHistoryEntry[];
  initialTotal?: number;
  /** Fetch function passed from a server wrapper to avoid importing server code. */
  fetchHistory: (
    automationId: string,
    businessId: string,
    filters: AutomationHistoryFilters,
  ) => Promise<{ entries: AutomationHistoryEntry[]; total: number }>;
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }
> = {
  success: { label: "Success", variant: "default", icon: CheckCircle2 },
  partial_failure: { label: "Partial", variant: "outline", icon: AlertTriangle },
  failure: { label: "Failed", variant: "destructive", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.failure;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatTimestamp(date: Date): { absolute: string; relative: string } {
  const d = new Date(date);
  const absolute = d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  let relative: string;
  if (diffMin < 1) relative = "just now";
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffMin < 1440) relative = `${Math.floor(diffMin / 60)}h ago`;
  else relative = `${Math.floor(diffMin / 1440)}d ago`;

  return { absolute, relative };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTriggerContext(triggerType: string, payload: unknown): string {
  if (!payload || typeof payload !== "object") return triggerType;
  const p = payload as Record<string, unknown>;

  // Show a brief contextual string based on trigger type
  if (p.customerName) return `${triggerType} — ${p.customerName}`;
  if (p.recipientEmail) return `${triggerType} — ${p.recipientEmail}`;
  if (p.quoteId) return `${triggerType} — Quote ${String(p.quoteId).slice(0, 8)}`;
  if (p.inquiryId) return `${triggerType} — Inquiry ${String(p.inquiryId).slice(0, 8)}`;
  if (p.jobId) return `${triggerType} — Job ${String(p.jobId).slice(0, 8)}`;
  if (p.invoiceId) return `${triggerType} — Invoice ${String(p.invoiceId).slice(0, 8)}`;
  return triggerType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export function AutomationHistory({
  automationId,
  businessId,
  initialEntries = [],
  initialTotal = 0,
  fetchHistory,
}: AutomationHistoryProps) {
  const [entries, setEntries] = useState<AutomationHistoryEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [isPending, startTransition] = useTransition();

  const loadHistory = useCallback(
    (filter: StatusFilter, newOffset: number) => {
      startTransition(async () => {
        const filters: AutomationHistoryFilters = {
          limit: PAGE_SIZE,
          offset: newOffset,
        };
        if (filter !== "all") {
          filters.status = filter;
        }
        const result = await fetchHistory(automationId, businessId, filters);
        setEntries(result.entries);
        setTotal(result.total);
      });
    },
    [automationId, businessId, fetchHistory],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handlePrevious = () => {
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
    loadHistory(statusFilter, newOffset);
  };

  const handleNext = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    loadHistory(statusFilter, newOffset);
  };

  // ---------------------------------------------------------------------------
  // Filter bar
  // ---------------------------------------------------------------------------

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "success", label: "Success" },
    { value: "partial_failure", label: "Partial failure" },
    { value: "failure", label: "Failed" },
  ];

  return (
    <DashboardSection
      description="Execution history for this automation. Newest runs first."
      title="Execution history"
    >
      {/* Status filter */}
      <div className="flex items-center gap-2 pb-4" role="toolbar" aria-label="Filter by status">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(opt.value);
              setOffset(0);
              loadHistory(opt.value, 0);
            }}
            aria-pressed={statusFilter === opt.value}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {entries.length === 0 && !isPending ? (
        <DashboardEmptyState
          className="border"
          description={
            statusFilter === "all"
              ? "This automation hasn't run yet. It will log executions here once triggered."
              : `No executions with status "${statusFilter}" found.`
          }
          title="No execution logs"
          variant="section"
        />
      ) : (
        <TooltipProvider delayDuration={300}>
          <DashboardTableContainer>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[11rem]">Timestamp</TableHead>
                  <TableHead className="w-[7rem]">Status</TableHead>
                  <TableHead>Trigger context</TableHead>
                  <TableHead className="w-[6rem] text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const ts = formatTimestamp(entry.createdAt);
                  const context = formatTriggerContext(
                    entry.triggerType,
                    entry.triggerPayload,
                  );
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex flex-col gap-0.5 cursor-default">
                              <span className="text-sm font-medium text-foreground truncate" suppressHydrationWarning>
                                {ts.absolute}
                              </span>
                              <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                                {ts.relative}
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent suppressHydrationWarning>
                            {ts.absolute} ({ts.relative})
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      <TableCell className="align-top">
                        <StatusBadge status={entry.status} />
                      </TableCell>

                      <TableCell className="align-top">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate text-sm text-foreground cursor-default">
                              {context}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md whitespace-normal">
                            {context}
                            {entry.error ? (
                              <span className="mt-1 block text-xs text-destructive">
                                Error: {entry.error}
                              </span>
                            ) : null}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      <TableCell className="align-top text-right">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="size-3" aria-hidden="true" />
                          {formatDuration(entry.durationMs)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DashboardTableContainer>
        </TooltipProvider>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({total} total)
          </p>
          <div className="dashboard-actions">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isPending}
              onClick={handlePrevious}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isPending}
              onClick={handleNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardSection>
  );
}
