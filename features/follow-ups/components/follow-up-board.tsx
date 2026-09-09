"use client";

import {
  useCallback,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
  SkipForward,
  Sunrise,
} from "lucide-react";
import { useProgressiveReveal } from "@/hooks/use-progressive-reveal";

import { OptimisticPendingIndicator } from "@/components/shared/optimistic-pending-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import {
  completeFollowUpAction,
  skipFollowUpAction,
} from "@/features/follow-ups/actions";
import { getFollowUpRelatedHref } from "@/features/follow-ups/components/follow-up-item";
import {
  FollowUpDueBadge,
} from "@/features/follow-ups/components/follow-up-status-badge";
import {
  formatFollowUpDate,
  getFollowUpChannelLabel,
  followUpRecurrenceLabels,
} from "@/features/follow-ups/utils";
import type { FollowUpChannel, FollowUpView } from "@/features/follow-ups/types";
import type { FollowUpActivityItem } from "@/features/follow-ups/types";
import {
  type OptimisticActionResult,
  useOptimisticMutation,
} from "@/hooks/use-optimistic-mutation";
import { cn } from "@/lib/utils";

type AutoSequenceItem = Extract<
  FollowUpActivityItem,
  { kind: "auto_sequence" }
>;

type FollowUpBoardProps = {
  overdue: FollowUpView[];
  dueToday: FollowUpView[];
  upcoming: FollowUpView[];
  businessSlug: string;
  createButton?: React.ReactNode;
  autoSequences?: AutoSequenceItem[];
};

type BoardColumns = {
  overdue: FollowUpView[];
  dueToday: FollowUpView[];
  upcoming: FollowUpView[];
};

type BoardColumnKey = keyof BoardColumns;

type BoardAction =
  | { type: "remove"; id: string }
  | { type: "restore"; followUp: FollowUpView; column: BoardColumnKey };

const columns = [
  {
    key: "overdue" as const,
    label: "Needs attention now",
    description: "Follow up before these quotes go cold.",
    icon: <AlertTriangle className="size-4 text-destructive" />,
    collapsedLimit: 8,
  },
  {
    key: "dueToday" as const,
    label: "Due today",
    description: "Your next customer conversations.",
    icon: <Sunrise className="size-4 text-primary" />,
    collapsedLimit: 8,
  },
  {
    key: "upcoming" as const,
    label: "Upcoming",
    description: "Scheduled and waiting.",
    icon: <Clock className="size-4 text-muted-foreground" />,
    collapsedLimit: 8,
  },
];

function formatQuoteAmount(totalInCents: number | null, currency: string | null) {
  if (totalInCents === null || totalInCents === undefined) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(totalInCents / 100);
  } catch {
    return `${(totalInCents / 100).toFixed(0)}`;
  }
}

const EXIT_DURATION_MS = 280;

function findFollowUpInBoard(board: BoardColumns, id: string) {
  for (const key of ["overdue", "dueToday", "upcoming"] as const) {
    const followUp = board[key].find((item) => item.id === id);
    if (followUp) {
      return { followUp, column: key };
    }
  }

  return null;
}

function boardReducer(current: BoardColumns, action: BoardAction): BoardColumns {
  switch (action.type) {
    case "remove":
      return {
        overdue: current.overdue.filter((item) => item.id !== action.id),
        dueToday: current.dueToday.filter((item) => item.id !== action.id),
        upcoming: current.upcoming.filter((item) => item.id !== action.id),
      };
    case "restore": {
      if (current[action.column].some((item) => item.id === action.followUp.id)) {
        return current;
      }

      return {
        ...current,
        [action.column]: [...current[action.column], action.followUp],
      };
    }
    default:
      return current;
  }
}

function ChannelIcon({ channel, className }: { channel: FollowUpChannel; className?: string }) {
  switch (channel) {
    case "email":
      return <Mail className={cn("size-3", className)} aria-hidden="true" />;
    case "phone":
      return <Phone className={cn("size-3", className)} aria-hidden="true" />;
    default:
      return <MessageSquare className={cn("size-3", className)} aria-hidden="true" />;
  }
}

export function FollowUpBoard({
  overdue,
  dueToday,
  upcoming,
  businessSlug,
  createButton,
  autoSequences = [],
}: FollowUpBoardProps) {
  const serverBoard = useMemo(
    () => ({ overdue, dueToday, upcoming }),
    [overdue, dueToday, upcoming],
  );
  const [optimisticBoard, setOptimisticBoard] = useOptimistic(serverBoard, boardReducer);
  const [, startTransition] = useTransition();
  const { runMutation, isPendingKey } = useOptimisticMutation();

  const totalFollowUps =
    optimisticBoard.overdue.length +
    optimisticBoard.dueToday.length +
    optimisticBoard.upcoming.length;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpView | null>(null);

  const exitingIds = useRef(new Set<string>());
  const [, forceRender] = useState(0);

  const getMotionState = useCallback((id: string) => {
    if (exitingIds.current.has(id)) return "exiting" as const;
    return undefined;
  }, []);

  const optimisticRemove = useCallback(
    (id: string, mutation?: () => Promise<OptimisticActionResult>) => {
      const located = findFollowUpInBoard(optimisticBoard, id);
      if (!located) {
        return;
      }

      const { followUp, column } = located;

      exitingIds.current.add(id);
      forceRender((n) => n + 1);

      setTimeout(() => {
        exitingIds.current.delete(id);
        forceRender((n) => n + 1);

        startTransition(() => {
          setOptimisticBoard({ type: "remove", id });
        });

        if (!mutation) {
          return;
        }

        runMutation({
          applyOptimistic: () => {},
          revertOptimistic: () => {
            startTransition(() => {
              setOptimisticBoard({ type: "restore", followUp, column });
            });
          },
          mutation,
          pendingKey: id,
        });
      }, EXIT_DURATION_MS);
    },
    [optimisticBoard, runMutation, setOptimisticBoard, startTransition],
  );

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return optimisticBoard;
    const q = searchQuery.toLowerCase();
    const filter = (items: FollowUpView[]) =>
      items.filter(
        (f) =>
          f.customerName.toLowerCase().includes(q) ||
          f.title.toLowerCase().includes(q) ||
          f.reason.toLowerCase().includes(q) ||
          (f.quoteNumber && f.quoteNumber.toLowerCase().includes(q)),
      );
    return {
      overdue: filter(optimisticBoard.overdue),
      dueToday: filter(optimisticBoard.dueToday),
      upcoming: filter(optimisticBoard.upcoming),
    };
  }, [optimisticBoard, searchQuery]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {totalFollowUps > 0 ? (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer, title, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search follow-ups"
            />
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {optimisticBoard.overdue.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <a href="#follow-ups-needs-attention">Jump to overdue</a>
            </Button>
          ) : null}
          {createButton}
        </div>
      </div>

      {totalFollowUps === 0 ? (
        <DashboardEmptyState
          title="No action needed today"
          description="When quotes go quiet or inquiries need a reply, your next customer conversations will appear here."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {columns.map((column) => (
              <FollowUpColumn
                key={column.key}
                column={column}
                items={filteredData[column.key]}
                businessSlug={businessSlug}
                onSelect={setSelectedFollowUp}
                getMotionState={getMotionState}
                onOptimisticRemove={optimisticRemove}
                isPendingKey={isPendingKey}
              />
            ))}
          </div>

          {autoSequences.length > 0 ? (
            <ActiveAutoSequencesSection
              sequences={autoSequences}
              businessSlug={businessSlug}
            />
          ) : null}
        </>
      )}

      <FollowUpDetailDialog
        followUp={selectedFollowUp}
        businessSlug={businessSlug}
        onClose={() => setSelectedFollowUp(null)}
        onOptimisticRemove={optimisticRemove}
        isPendingKey={isPendingKey}
      />
    </>
  );
}

function FollowUpColumn({
  column,
  items,
  businessSlug,
  onSelect,
  getMotionState,
  onOptimisticRemove,
  isPendingKey,
}: {
  column: (typeof columns)[number];
  items: FollowUpView[];
  businessSlug: string;
  onSelect: (followUp: FollowUpView) => void;
  getMotionState: (id: string) => "exiting" | undefined;
  onOptimisticRemove: (
    id: string,
    mutation?: () => Promise<OptimisticActionResult>,
  ) => void;
  isPendingKey: (key: string) => boolean;
}) {
  const { visibleCount, hasMore, sentinelRef, revealMore, showFewer } =
    useProgressiveReveal({
      total: items.length,
      initialBatch: column.collapsedLimit,
      batchSize: 5,
    });
  const visibleItems = items.slice(0, visibleCount);
  const isExpanded = visibleCount > column.collapsedLimit;
  const remaining = items.length - visibleCount;
  const sectionId =
    column.key === "overdue" ? "follow-ups-needs-attention" : undefined;

  return (
    <section
      aria-label={column.label}
      className="flex min-h-48 flex-col gap-3 rounded-xl p-4 bg-muted/50"
    >
      <div className="flex items-center gap-2" id={sectionId}>
        {column.icon}
        <span className="text-sm font-medium">
          {column.label} ({items.length})
        </span>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{column.description}</p>

      <div className="flex flex-col gap-2">
        {visibleItems.map((followUp) => (
          <FollowUpCard
            key={followUp.id}
            followUp={followUp}
            businessSlug={businessSlug}
            onSelect={onSelect}
            motionState={getMotionState(followUp.id)}
            onOptimisticRemove={onOptimisticRemove}
            isPendingKey={isPendingKey}
          />
        ))}
        {hasMore ? <div ref={sentinelRef} className="h-1" /> : null}
      </div>

      {items.length > column.collapsedLimit ? (
        <div className="flex items-center gap-2 pt-1">
          {hasMore ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={revealMore}
              className="text-muted-foreground"
              aria-label={`Show more ${column.label} follow-ups, ${remaining} remaining`}
            >
              <ChevronDown data-icon="inline-start" />
              Show more ({remaining} more)
            </Button>
          ) : null}
          {isExpanded ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={showFewer}
              className="text-muted-foreground"
              aria-label={`Show fewer ${column.label} follow-ups`}
            >
              <ChevronUp data-icon="inline-start" />
              Show fewer
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function FollowUpCard({
  followUp,
  businessSlug: _businessSlug,
  onSelect,
  motionState,
  onOptimisticRemove,
  isPendingKey,
}: {
  followUp: FollowUpView;
  businessSlug: string;
  onSelect: (followUp: FollowUpView) => void;
  motionState?: "exiting";
  onOptimisticRemove: (
    id: string,
    mutation?: () => Promise<OptimisticActionResult>,
  ) => void;
  isPendingKey: (key: string) => boolean;
}) {
  const channelLabel = getFollowUpChannelLabel(followUp.channel);
  const dueLabel = formatFollowUpDate(followUp.dueAt);
  const isPending = isPendingKey(followUp.id);
  const quoteAmount = followUp.quoteContext
    ? formatQuoteAmount(
        followUp.quoteContext.totalInCents,
        followUp.quoteContext.currency,
      )
    : null;
  const isQuoteViewed = Boolean(followUp.quoteContext?.viewedAt);

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    onOptimisticRemove(followUp.id, async () => {
      const formData = new FormData();
      return completeFollowUpAction.bind(null, followUp.id)({}, formData);
    });
  }

  function handleSkip(e: React.MouseEvent) {
    e.stopPropagation();
    onOptimisticRemove(followUp.id, async () => {
      const formData = new FormData();
      return skipFollowUpAction.bind(null, followUp.id)({}, formData);
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(followUp)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(followUp); } }}
      className="motion-list-item relative flex w-full cursor-pointer flex-col gap-2 rounded-lg border bg-background p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      data-motion-state={motionState}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">
          {followUp.customerName}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
              <OptimisticPendingIndicator pending={isPending} className="absolute -right-0.5 -top-0.5" />
              <span className="sr-only">Follow-up actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleComplete}>
              Mark contacted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSkip}>
              Dismiss
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{followUp.title}</p>
      {followUp.whyNow ? (
        <p className="line-clamp-2 text-xs font-medium text-foreground/80">
          {followUp.whyNow}
        </p>
      ) : null}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3" aria-hidden="true" />
          {dueLabel}
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-1" aria-label={channelLabel}>
          <ChannelIcon channel={followUp.channel} />
        </span>
        {quoteAmount ? (
          <>
            <span className="text-border">·</span>
            <span className="font-medium text-foreground/80 tabular-nums">
              {quoteAmount}
            </span>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {followUp.related.label ? (
          <span className="truncate text-xs text-muted-foreground/80">
            {followUp.related.label}
          </span>
        ) : null}
        {followUp.quoteContext?.status ? (
          <Badge variant="outline" className="rounded-full text-[11px]">
            {followUp.quoteContext.status.replace(/_/g, " ")}
            {isQuoteViewed ? " · viewed" : ""}
          </Badge>
        ) : null}
        <Badge variant="secondary" className="rounded-full text-[11px]">
          {followUp.nextActionLabel}
        </Badge>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Follow-up Detail Dialog                                                    */
/* -------------------------------------------------------------------------- */

function FollowUpDetailDialog({
  followUp,
  businessSlug,
  onClose,
  onOptimisticRemove,
  isPendingKey,
}: {
  followUp: FollowUpView | null;
  businessSlug: string;
  onClose: () => void;
  onOptimisticRemove: (
    id: string,
    mutation?: () => Promise<OptimisticActionResult>,
  ) => void;
  isPendingKey: (key: string) => boolean;
}) {

  if (!followUp) {
    return null;
  }

  const relatedHref = getFollowUpRelatedHref(businessSlug, followUp);
  const channelLabel = getFollowUpChannelLabel(followUp.channel);
  const dueLabel = formatFollowUpDate(followUp.dueAt);
  const hasRecurrence = followUp.recurrence !== "none";
  const isActioning = isPendingKey(followUp.id);
  const quoteAmount = followUp.quoteContext
    ? formatQuoteAmount(
        followUp.quoteContext.totalInCents,
        followUp.quoteContext.currency,
      )
    : null;

  function handleComplete() {
    onOptimisticRemove(followUp!.id, async () => {
      const formData = new FormData();
      const result = await completeFollowUpAction.bind(null, followUp!.id)({}, formData);
      if (result.success) {
        onClose();
      }
      return result;
    });
  }

  function handleSkip() {
    onOptimisticRemove(followUp!.id, async () => {
      const formData = new FormData();
      const result = await skipFollowUpAction.bind(null, followUp!.id)({}, formData);
      if (result.success) {
        onClose();
      }
      return result;
    });
  }

  return (
    <Dialog open={Boolean(followUp)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{followUp.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-5">
            {/* Customer & due info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {followUp.customerName}
                </span>
                <FollowUpDueBadge bucket={followUp.dueBucket} />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" aria-hidden="true" />
                  {dueLabel}
                </span>
                <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/40" />
                <span className="inline-flex items-center gap-1">
                  <ChannelIcon channel={followUp.channel} className="size-3" />
                  {channelLabel}
                </span>
                {hasRecurrence && (
                  <>
                    <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/40" />
                    <span>
                      Repeats: {followUpRecurrenceLabels[followUp.recurrence]}
                      {followUp.recurrenceLimit ? ` (${followUp.recurrenceCount}/${followUp.recurrenceLimit})` : ""}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Reason */}
            {followUp.reason && (
              <div className="flex flex-col gap-1.5">
                <span className="meta-label">Reason</span>
                <p className="text-sm leading-relaxed text-foreground">
                  {followUp.reason}
                </p>
              </div>
            )}

            {/* Why now + quote context */}
            {followUp.whyNow ? (
              <div className="flex flex-col gap-1.5">
                <span className="meta-label">Why now</span>
                <p className="text-sm leading-relaxed text-foreground">
                  {followUp.whyNow}
                </p>
              </div>
            ) : null}

            {followUp.quoteContext ? (
              <div className="flex flex-col gap-1.5">
                <span className="meta-label">Quote context</span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {quoteAmount ? (
                    <span className="font-medium text-foreground tabular-nums">
                      {quoteAmount}
                    </span>
                  ) : null}
                  {followUp.quoteContext.status ? (
                    <Badge variant="outline" className="rounded-full">
                      {followUp.quoteContext.status.replace(/_/g, " ")}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="rounded-full">
                    {followUp.quoteContext.viewedAt ? "Viewed" : "Not viewed"}
                  </Badge>
                  {followUp.quoteContext.sentAt ? (
                    <span>Sent {formatFollowUpDate(followUp.quoteContext.sentAt)}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Suggested message */}
            {followUp.suggestedMessage && (
              <div data-padding="none" className="soft-panel flex flex-col gap-1.5 px-4 py-3 shadow-none">
                <span className="meta-label">Suggested message</span>
                <p className="text-sm leading-relaxed text-foreground">
                  {followUp.suggestedMessage}
                </p>
              </div>
            )}

            {/* Linked record button */}
            <div className="flex flex-col gap-2">
              <span className="meta-label">Linked {followUp.related.kind}</span>
              <Button asChild variant="outline" className="justify-start">
                <Link href={relatedHref} onClick={onClose} prefetch={true}>
                  <ArrowRight data-icon="inline-start" />
                  {followUp.related.label}
                </Link>
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-border/50 pt-4">
              <Button
                onClick={handleComplete}
                disabled={isActioning}
                size="sm"
              >
                <OptimisticPendingIndicator pending={isActioning} />
                <CheckCircle2 data-icon="inline-start" />
                Mark contacted
              </Button>
              <Button
                onClick={handleSkip}
                disabled={isActioning}
                variant="outline"
                size="sm"
              >
                <OptimisticPendingIndicator pending={isActioning} />
                <SkipForward data-icon="inline-start" />
                Dismiss
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ActiveAutoSequencesSection({
  sequences,
  businessSlug,
}: {
  sequences: AutoSequenceItem[];
  businessSlug: string;
}) {
  if (sequences.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Active automatic sequences"
      className="flex flex-col gap-3 rounded-xl p-4 bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Active automatic sequences ({sequences.length})
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Automatic emails send until the customer views or responds. Pause or
        stop them from the quote page.
      </p>
      <ul className="flex flex-col gap-2">
        {sequences.map((item) => (
          <li
            key={item.quoteId}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-background px-3 py-2.5 text-xs"
          >
            <span className="font-medium text-foreground">
              {item.customerName}
            </span>
            <span className="text-muted-foreground">
              {item.quoteNumber ? `Quote ${item.quoteNumber}` : item.quoteTitle}
            </span>
            <Badge variant="secondary" className="rounded-full">
              Automatic · {item.sequence.attempts} of {item.sequence.maxAttempts} sent
            </Badge>
            {item.sequence.nextSendAt ? (
              <span className="text-muted-foreground">
                Next send {formatFollowUpDate(item.sequence.nextSendAt)}
              </span>
            ) : null}
            <Button asChild variant="outline" size="xs" className="ml-auto">
              <Link
                href={`/${businessSlug}/quotes/${item.quoteId}`}
                prefetch={true}
              >
                Open quote
                <ArrowRight data-icon="inline-end" className="size-3" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
