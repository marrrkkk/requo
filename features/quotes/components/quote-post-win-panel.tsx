"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import {
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { QuoteCancellationDialog } from "@/features/quotes/components/quote-cancellation-dialog";
import { QuoteCompletionDialog } from "@/features/quotes/components/quote-completion-dialog";
import { QuotePostAcceptanceForm } from "@/features/quotes/components/quote-post-acceptance-form";
import type {
  PostWinChecklistItem,
  QuoteCancellationActionState,
  QuoteCompletionActionState,
  QuotePostAcceptanceActionState,
  QuotePostAcceptanceStatus,
  PostWinChecklistActionState,
} from "@/features/quotes/types";
import {
  formatQuoteDateTime,
  formatQuoteMoney,
} from "@/features/quotes/utils";

type QuotePostWinPanelProps = {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  totalInCents: number;
  currency: string;
  acceptedAt: Date | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  cancellationReason: string | null;
  cancellationNote: string | null;
  postAcceptanceStatus: QuotePostAcceptanceStatus;
  checklistItems: PostWinChecklistItem[];
  postAcceptanceAction: (
    state: QuotePostAcceptanceActionState,
    formData: FormData,
  ) => Promise<QuotePostAcceptanceActionState>;
  cancelAction: (
    state: QuoteCancellationActionState,
    formData: FormData,
  ) => Promise<QuoteCancellationActionState>;
  completeAction: (
    state: QuoteCompletionActionState,
    formData: FormData,
  ) => Promise<QuoteCompletionActionState>;
  toggleChecklistItemAction: (
    quoteId: string,
    checklistItemId: string,
  ) => Promise<PostWinChecklistActionState>;
  createChecklistItemAction: (
    quoteId: string,
    label: string,
  ) => Promise<PostWinChecklistActionState>;
};

const cancellationReasonLabels: Record<string, string> = {
  customer_changed_mind: "Customer changed mind",
  price_too_high: "Price too high",
  schedule_conflict: "Schedule conflict",
  scope_changed: "Scope changed",
  no_deposit_payment: "No deposit/payment",
  duplicate_mistake: "Duplicate/mistake",
  business_unavailable: "Business unavailable",
  other: "Other",
};

export function QuotePostWinPanel({
  quoteId,
  quoteNumber,
  customerName,
  totalInCents,
  currency,
  acceptedAt,
  completedAt,
  canceledAt,
  cancellationReason,
  cancellationNote,
  postAcceptanceStatus,
  checklistItems,
  postAcceptanceAction,
  cancelAction,
  completeAction,
  toggleChecklistItemAction,
  createChecklistItemAction,
}: QuotePostWinPanelProps) {
  const isCompleted = postAcceptanceStatus === "completed";
  const isCanceled = postAcceptanceStatus === "canceled";
  const isTerminal = isCompleted || isCanceled;
  const completedCount = checklistItems.filter((item) => item.completedAt).length;
  const totalItems = checklistItems.length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <DashboardSection
      description={
        isCompleted
          ? "This work has been completed."
          : isCanceled
            ? "This accepted quote was canceled."
            : "Track what happens after the customer says yes."
      }
      title={
        isCompleted
          ? "Work completed"
          : isCanceled
            ? "Canceled after acceptance"
            : "Post-win — what\u2019s next?"
      }
    >
      <div className="flex flex-col gap-5">
        {/* Summary tiles */}
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="Customer" value={customerName} />
          <InfoTile
            label="Accepted total"
            value={formatQuoteMoney(totalInCents, currency)}
          />
          <InfoTile
            label="Accepted"
            value={acceptedAt ? formatQuoteDateTime(acceptedAt) : "—"}
          />
          {completedAt ? (
            <InfoTile
              label="Completed"
              value={formatQuoteDateTime(completedAt)}
            />
          ) : canceledAt ? (
            <InfoTile
              label="Canceled"
              value={formatQuoteDateTime(canceledAt)}
            />
          ) : (
            <InfoTile label="Status" value={postAcceptanceStatus === "none" ? "Needs next step" : postAcceptanceStatus.replace(/_/g, " ")} />
          )}
        </div>

        {/* Cancellation info */}
        {isCanceled && cancellationReason ? (
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Cancellation reason</p>
            <p className="mt-2 text-sm text-foreground">
              {cancellationReasonLabels[cancellationReason] || cancellationReason}
            </p>
            {cancellationNote ? (
              <>
                <p className="meta-label mt-3">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-normal sm:leading-7 text-foreground">
                  {cancellationNote}
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Checklist */}
        {totalItems > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="meta-label">
                Checklist — {completedCount}/{totalItems}
              </p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <ul className="flex flex-col gap-1">
              {checklistItems.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  quoteId={quoteId}
                  disabled={isTerminal}
                  toggleAction={toggleChecklistItemAction}
                />
              ))}
            </ul>
            {!isTerminal ? (
              <AddChecklistItemForm
                quoteId={quoteId}
                createAction={createChecklistItemAction}
              />
            ) : null}
          </div>
        ) : null}

        {/* Post-acceptance status */}
        {!isTerminal ? (
          <QuotePostAcceptanceForm
            key={postAcceptanceStatus}
            action={postAcceptanceAction}
            currentStatus={postAcceptanceStatus}
          />
        ) : null}

        {/* Terminal actions */}
        {!isTerminal ? (
          <div className="dashboard-actions pt-1">
            <QuoteCompletionDialog
              action={completeAction}
              quoteNumber={quoteNumber}
            />
            <QuoteCancellationDialog
              action={cancelAction}
              quoteNumber={quoteNumber}
            />
          </div>
        ) : null}
      </div>
    </DashboardSection>
  );
}

function ChecklistItemRow({
  item,
  quoteId,
  disabled,
  toggleAction,
}: {
  item: PostWinChecklistItem;
  quoteId: string;
  disabled: boolean;
  toggleAction: (
    quoteId: string,
    checklistItemId: string,
  ) => Promise<PostWinChecklistActionState>;
}) {
  const [isPending, startTransition] = useTransition();
  const isCompleted = Boolean(item.completedAt);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAction(quoteId, item.id);

      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/40">
      <button
        className="flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        disabled={disabled || isPending}
        onClick={handleToggle}
        type="button"
        aria-label={isCompleted ? `Uncheck "${item.label}"` : `Check off "${item.label}"`}
      >
        {isCompleted ? (
          <CheckCircle2 className="size-[1.125rem] text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle className="size-[1.125rem]" />
        )}
      </button>
      <span
        className={`text-sm ${
          isCompleted
            ? "text-muted-foreground line-through"
            : "text-foreground"
        } ${isPending ? "opacity-50" : ""}`}
      >
        {item.label}
      </span>
    </li>
  );
}

function AddChecklistItemForm({
  quoteId,
  createAction,
}: {
  quoteId: string;
  createAction: (
    quoteId: string,
    label: string,
  ) => Promise<PostWinChecklistActionState>;
}) {
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = label.trim();

    if (!trimmed) {
      return;
    }

    startTransition(async () => {
      const result = await createAction(quoteId, trimmed);

      if (result.error) {
        toast.error(result.error);
      } else {
        setLabel("");
      }
    });
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <Input
        className="h-8 text-sm"
        disabled={isPending}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Add checklist item"
        value={label}
      />
      <Button
        disabled={isPending || !label.trim()}
        size="sm"
        type="submit"
        variant="outline"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
