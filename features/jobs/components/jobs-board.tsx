"use client";

import { useOptimistic, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useProgressiveReveal } from "@/hooks/use-progressive-reveal";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DashboardEmptyState, DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Spinner } from "@/components/ui/spinner";
import { updateJobStatusAction, deleteJobAction } from "@/features/jobs/actions";
import { createInvoiceFromJobAction } from "@/features/invoices/actions";
import { getBusinessJobPath } from "@/features/businesses/routes";
import type { DashboardJobListItem, JobStatus } from "@/features/jobs/types";

type JobsBoardProps = {
  board: Record<JobStatus, DashboardJobListItem[]>;
  businessSlug: string;
};

const columns: { status: JobStatus; label: string; icon: React.ReactNode; collapsedLimit: number }[] = [
  { status: "todo", label: "To Do", icon: <Circle className="size-4 text-muted-foreground" />, collapsedLimit: 8 },
  { status: "in_progress", label: "In Progress", icon: <Clock className="size-4 text-primary" />, collapsedLimit: 8 },
  { status: "done", label: "Done", icon: <CheckCircle2 className="size-4 text-primary" />, collapsedLimit: 5 },
];

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function JobsBoard({ board: serverBoard, businessSlug }: JobsBoardProps) {
  const totalJobs = Object.values(serverBoard).reduce((sum, col) => sum + col.length, 0);
  const [_isPending, startTransition] = useTransition();
  const [activeJob, setActiveJob] = useState<DashboardJobListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Optimistic board state for instant drag feedback
  const [optimisticBoard, setOptimisticBoard] = useOptimistic(
    serverBoard,
    (current, action: { jobId: string; from: JobStatus; to: JobStatus }) => {
      const job = current[action.from].find((j) => j.id === action.jobId);
      if (!job) return current;
      return {
        ...current,
        [action.from]: current[action.from].filter((j) => j.id !== action.jobId),
        [action.to]: [...current[action.to], { ...job, status: action.to }],
      };
    },
  );

  // Filter board by search
  const filteredBoard = useMemo(() => {
    if (!searchQuery.trim()) return optimisticBoard;
    const q = searchQuery.toLowerCase();
    return {
      todo: optimisticBoard.todo.filter(
        (j) => j.title.toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q) || j.quoteNumber.toLowerCase().includes(q),
      ),
      in_progress: optimisticBoard.in_progress.filter(
        (j) => j.title.toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q) || j.quoteNumber.toLowerCase().includes(q),
      ),
      done: optimisticBoard.done.filter(
        (j) => j.title.toLowerCase().includes(q) || j.customerName.toLowerCase().includes(q) || j.quoteNumber.toLowerCase().includes(q),
      ),
    };
  }, [optimisticBoard, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function findJobColumn(jobId: string): JobStatus | null {
    for (const status of ["todo", "in_progress", "done"] as JobStatus[]) {
      if (optimisticBoard[status].some((j) => j.id === jobId)) {
        return status;
      }
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const jobId = event.active.id as string;
    for (const status of ["todo", "in_progress", "done"] as JobStatus[]) {
      const job = optimisticBoard[status].find((j) => j.id === jobId);
      if (job) {
        setActiveJob(job);
        break;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);

    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const fromColumn = findJobColumn(jobId);

    let toColumn: JobStatus | null = null;
    const overId = over.id as string;

    if (["todo", "in_progress", "done"].includes(overId)) {
      toColumn = overId as JobStatus;
    } else {
      toColumn = findJobColumn(overId);
    }

    if (!fromColumn || !toColumn || fromColumn === toColumn) return;

    startTransition(async () => {
      setOptimisticBoard({ jobId, from: fromColumn, to: toColumn });
      await updateJobStatusAction(jobId, toColumn);
    });
  }

  function handleDragOver(_event: DragOverEvent) { }

  return (
    <DashboardPage>
      <PageHeader
        title="Jobs"
        description="Track accepted work from start to finish."
      />

      {totalJobs === 0 ? (
        <DashboardEmptyState
          title="No jobs yet"
          description="When a quote is accepted, create a job to track the work through completion."
        />
      ) : (
        <>
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, customer, or quote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {columns.map((column) => (
                <JobColumn
                  key={column.status}
                  column={column}
                  items={filteredBoard[column.status]}
                  businessSlug={businessSlug}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeJob ? (
                <JobCardOverlay job={activeJob} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </DashboardPage>
  );
}

function JobColumn({
  column,
  items,
  businessSlug,
}: {
  column: (typeof columns)[number];
  items: DashboardJobListItem[];
  businessSlug: string;
}) {
  const { visibleCount, hasMore, sentinelRef } = useProgressiveReveal({
    total: items.length,
    initialBatch: column.collapsedLimit,
    batchSize: 5,
  });
  const visibleItems = items.slice(0, visibleCount);

  const { setNodeRef, isOver } = useSortable({
    id: column.status,
    data: { type: "column", status: column.status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-48 flex-col gap-3 rounded-xl p-4 transition-colors ${isOver ? "bg-accent/60" : "bg-muted/50"
        }`}
    >
      <div className="flex items-center gap-2">
        {column.icon}
        <span className="text-sm font-medium">{column.label}</span>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {visibleItems.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            businessSlug={businessSlug}
            currentStatus={column.status}
          />
        ))}
        {hasMore ? <div ref={sentinelRef} className="h-1" /> : null}
      </div>
    </div>
  );
}

function DraggableJobCard({
  job,
  businessSlug,
  currentStatus,
}: {
  job: DashboardJobListItem;
  businessSlug: string;
  currentStatus: JobStatus;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: job.id,
    data: { type: "job", job, status: currentStatus },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCard
        job={job}
        businessSlug={businessSlug}
        currentStatus={currentStatus}
      />
    </div>
  );
}

function JobCardOverlay({ job }: { job: DashboardJobListItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-lg ring-2 ring-primary/20">
      <span className="text-sm font-medium leading-tight">{job.title}</span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{job.customerName}</span>
        <span className="text-border">·</span>
        <span>{job.quoteNumber}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {formatCurrency(job.totalInCents, job.currency)}
        </span>
        {job.itemCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {job.completedItemCount}/{job.itemCount} items
          </span>
        )}
      </div>
    </div>
  );
}

function JobCard({
  job,
  businessSlug,
  currentStatus,
}: {
  job: DashboardJobListItem;
  businessSlug: string;
  currentStatus: JobStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: JobStatus) {
    startTransition(async () => {
      await updateJobStatusAction(job.id, newStatus);
    });
  }

  function handleGenerateInvoice() {
    startTransition(async () => {
      await createInvoiceFromJobAction(job.id);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteJobAction(job.id);
    });
  }

  const nextStatuses = columns
    .filter((c) => c.status !== currentStatus)
    .map((c) => c);

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-sm transition-shadow hover:shadow-md">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
          <Spinner className="size-4" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={getBusinessJobPath(businessSlug, job.id)}
          className="text-sm font-medium leading-tight hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {job.title}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
              <span className="sr-only">Job actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextStatuses.map((col) => (
              <DropdownMenuItem
                key={col.status}
                onClick={() => handleStatusChange(col.status)}
              >
                Move to {col.label}
              </DropdownMenuItem>
            ))}
            {currentStatus === "done" && (
              <DropdownMenuItem onClick={handleGenerateInvoice}>
                Generate invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{job.customerName}</span>
        <span className="text-border">·</span>
        <span>{job.quoteNumber}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {formatCurrency(job.totalInCents, job.currency)}
        </span>
        {job.itemCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {job.completedItemCount}/{job.itemCount} items
          </span>
        )}
      </div>
    </div>
  );
}
