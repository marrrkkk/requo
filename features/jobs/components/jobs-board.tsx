"use client";

import {
  useOptimistic,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useTransition,
  useState,
} from "react";
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
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useProgressiveReveal } from "@/hooks/use-progressive-reveal";

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
import {
  getBusinessInvoicePath,
  getBusinessJobPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { useProgressRouter } from "@/hooks/use-progress-router";
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
  const [activeJob, setActiveJob] = useState<DashboardJobListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { runMutation } = useOptimisticMutation();
  const optimisticBoardRef = useRef(serverBoard);
  const boardSnapshotRef = useRef(serverBoard);

  // Optimistic board state for instant drag feedback and delete
  const [optimisticBoard, setOptimisticBoard] = useOptimistic(
    serverBoard,
    (
      current,
      action:
        | { type: "move"; jobId: string; from: JobStatus; to: JobStatus }
        | { type: "delete"; jobId: string }
        | { type: "restore"; board: Record<JobStatus, DashboardJobListItem[]> },
    ) => {
      if (action.type === "restore") {
        return action.board;
      }
      if (action.type === "delete") {
        return {
          todo: current.todo.filter((j) => j.id !== action.jobId),
          in_progress: current.in_progress.filter((j) => j.id !== action.jobId),
          done: current.done.filter((j) => j.id !== action.jobId),
        };
      }
      const job = current[action.from].find((j) => j.id === action.jobId);
      if (!job) return current;
      return {
        ...current,
        [action.from]: current[action.from].filter((j) => j.id !== action.jobId),
        [action.to]: [...current[action.to], { ...job, status: action.to }],
      };
    },
  );

  useEffect(() => {
    optimisticBoardRef.current = optimisticBoard;
  }, [optimisticBoard]);

  // Track exiting jobs for animation
  const exitingJobIds = useRef(new Set<string>());
  const [, forceRender] = useState(0);

  const getJobMotionState = useCallback((id: string) => {
    if (exitingJobIds.current.has(id)) return "exiting" as const;
    return undefined;
  }, []);

  const optimisticDeleteJob = useCallback(
    (jobId: string) => {
      boardSnapshotRef.current = optimisticBoardRef.current;
      exitingJobIds.current.add(jobId);
      forceRender((n) => n + 1);

      setTimeout(() => {
        runMutation({
          applyOptimistic: () => {
            setOptimisticBoard({ type: "delete", jobId });
          },
          revertOptimistic: () => {
            setOptimisticBoard({
              type: "restore",
              board: boardSnapshotRef.current,
            });
            exitingJobIds.current.delete(jobId);
            forceRender((n) => n + 1);
          },
          mutation: () => deleteJobAction(jobId),
          pendingKey: `delete-${jobId}`,
          onSuccess: () => {
            exitingJobIds.current.delete(jobId);
          },
          onError: () => {
            exitingJobIds.current.delete(jobId);
            forceRender((n) => n + 1);
          },
        });
      }, 280);
    },
    [runMutation, setOptimisticBoard],
  );

  const optimisticStatusChange = useCallback(
    (jobId: string, from: JobStatus, to: JobStatus) => {
      runMutation({
        applyOptimistic: () => {
          setOptimisticBoard({ type: "move", jobId, from, to });
        },
        revertOptimistic: () => {
          setOptimisticBoard({ type: "move", jobId, from: to, to: from });
        },
        mutation: () => updateJobStatusAction(jobId, to),
        pendingKey: `status-${jobId}`,
      });
    },
    [runMutation, setOptimisticBoard],
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

    runMutation({
      applyOptimistic: () => {
        setOptimisticBoard({
          type: "move",
          jobId,
          from: fromColumn,
          to: toColumn,
        });
      },
      revertOptimistic: () => {
        setOptimisticBoard({
          type: "move",
          jobId,
          from: toColumn,
          to: fromColumn,
        });
      },
      mutation: () => updateJobStatusAction(jobId, toColumn),
      pendingKey: `move-${jobId}`,
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
          description="Accepted quotes are ready to become jobs. Start with the won work that needs tracking."
          action={
            <Button asChild>
              <Link href={`${getBusinessQuotesPath(businessSlug)}?status=accepted`}>
                Review accepted quotes
              </Link>
            </Button>
          }
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
                  getMotionState={getJobMotionState}
                  onOptimisticDelete={optimisticDeleteJob}
                  onOptimisticStatusChange={optimisticStatusChange}
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
  getMotionState,
  onOptimisticDelete,
  onOptimisticStatusChange,
}: {
  column: (typeof columns)[number];
  items: DashboardJobListItem[];
  businessSlug: string;
  getMotionState: (id: string) => "exiting" | undefined;
  onOptimisticDelete: (jobId: string) => void;
  onOptimisticStatusChange: (jobId: string, from: JobStatus, to: JobStatus) => void;
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
            motionState={getMotionState(job.id)}
            onOptimisticDelete={onOptimisticDelete}
            onOptimisticStatusChange={onOptimisticStatusChange}
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
  motionState,
  onOptimisticDelete,
  onOptimisticStatusChange,
}: {
  job: DashboardJobListItem;
  businessSlug: string;
  currentStatus: JobStatus;
  motionState?: "exiting";
  onOptimisticDelete: (jobId: string) => void;
  onOptimisticStatusChange: (jobId: string, from: JobStatus, to: JobStatus) => void;
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
    <div ref={setNodeRef} style={style} className="motion-list-item" data-motion-state={motionState} {...attributes} {...listeners}>
      <JobCard
        job={job}
        businessSlug={businessSlug}
        currentStatus={currentStatus}
        onOptimisticDelete={onOptimisticDelete}
        onOptimisticStatusChange={onOptimisticStatusChange}
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
  onOptimisticDelete,
  onOptimisticStatusChange,
}: {
  job: DashboardJobListItem;
  businessSlug: string;
  currentStatus: JobStatus;
  onOptimisticDelete: (jobId: string) => void;
  onOptimisticStatusChange: (jobId: string, from: JobStatus, to: JobStatus) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useProgressRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleStatusChange(newStatus: JobStatus) {
    onOptimisticStatusChange(job.id, currentStatus, newStatus);
  }

  function handleGenerateInvoice() {
    startTransition(async () => {
      const result = await createInvoiceFromJobAction(job.id);
      if (result.invoiceId) {
        router.push(getBusinessInvoicePath(businessSlug, result.invoiceId));
      }
    });
  }

  function handleDelete() {
    setShowDeleteConfirm(false);
    onOptimisticDelete(job.id);
  }

  const nextStatuses = columns
    .filter((c) => c.status !== currentStatus)
    .map((c) => c);

  return (
    <>
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
          <DropdownMenu modal={false}>
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
                  onSelect={() => handleStatusChange(col.status)}
                >
                  Move to {col.label}
                </DropdownMenuItem>
              ))}
              {currentStatus === "done" && (
                <DropdownMenuItem onSelect={handleGenerateInvoice}>
                  Generate invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => setShowDeleteConfirm(true)}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the job and its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button disabled={isPending} variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={isPending}
                onClick={handleDelete}
                variant="destructive"
              >
                {isPending ? (
                  <>
                    <Spinner className="size-4" aria-hidden="true" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
