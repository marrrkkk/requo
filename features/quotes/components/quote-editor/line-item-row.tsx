"use client";

import { useState } from "react";
import { GripVertical, Trash2, Bookmark } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AiQuoteLineItemReview } from "@/features/quotes/types";
import { cn } from "@/lib/utils";
import {
  canSaveLineItemToPricingLibrary,
  getLineItemReviewBadgeLabel,
  shouldShowLineItemReviewBadge,
} from "./line-item-review";
import type { EditorLineItem } from "./types";

const REVIEW_BADGE_CLASS_NAMES: Record<
  "matched" | "calculated",
  string
> = {
  matched:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200",
  calculated:
    "border-blue-500/30 bg-blue-500/15 text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/12 dark:text-blue-200",
};

export function AiReviewBadge({ review }: { review: AiQuoteLineItemReview }) {
  const label = getLineItemReviewBadgeLabel(review);

  if (!label) {
    return null;
  }

  const tone =
    review.reviewStatus === "calculated" ? "calculated" : "matched";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        REVIEW_BADGE_CLASS_NAMES[tone],
      )}
    >
      {label}
    </span>
  );

  if (!review.reason) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{review.reason}</TooltipContent>
    </Tooltip>
  );
}

export function LineItemCard({
  item,
  index,
  currency,
  unitPriceInCents,
  safeQuantity,
  isPending,
  canRemove,
  onUpdate,
  onRemove,
  onSaveToPricing,
  canSaveToPricing,
  formatMoney,
}: {
  item: EditorLineItem;
  index: number;
  currency: string;
  unitPriceInCents: number;
  safeQuantity: number;
  isPending: boolean;
  canRemove: boolean;
  canSaveToPricing: boolean;
  onUpdate: (id: string, patch: Partial<EditorLineItem>) => void;
  onRemove: (id: string) => void;
  onSaveToPricing?: (id: string) => Promise<void>;
  formatMoney: (cents: number, currency: string) => string;
}) {
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [isSavingToPricing, setIsSavingToPricing] = useState(false);
  const showSaveToPricing =
    canSaveToPricing &&
    Boolean(onSaveToPricing) &&
    canSaveLineItemToPricingLibrary({ item, unitPriceInCents });

  async function handleConfirmSaveToPricing() {
    if (!onSaveToPricing) {
      return;
    }

    setIsSavingToPricing(true);

    try {
      await onSaveToPricing(item.id);
      setConfirmSaveOpen(false);
    } finally {
      setIsSavingToPricing(false);
    }
  }
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/line-item rounded-lg border border-border/60 bg-background px-3 py-2.5 transition-colors hover:border-border",
        item.isAiGenerated && "ai-glow-border",
      )}
    >
      {/* Single-row compact layout */}
      <div className="flex items-center gap-2">
        <button
          aria-label={`Reorder item ${index + 1}`}
          className="shrink-0 cursor-grab touch-none text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <Input
          id={`quote-item-description-${item.id}`}
          aria-label={`Item ${index + 1} description`}
          className="min-w-0 flex-1"
          maxLength={400}
          value={item.description}
          onChange={(event) =>
            onUpdate(item.id, {
              description: event.currentTarget.value,
            })
          }
          placeholder="What are you quoting for?"
          required
          disabled={isPending}
        />

        <div className="flex shrink-0 items-center gap-1.5">
          <Input
            id={`quote-item-quantity-${item.id}`}
            aria-label={`Item ${index + 1} quantity`}
            className="w-14 text-center"
            inputMode="numeric"
            max="999999999"
            type="number"
            min="1"
            required
            step="1"
            value={item.quantity}
            onChange={(event) =>
              onUpdate(item.id, {
                quantity: event.currentTarget.value,
              })
            }
            disabled={isPending}
          />

          <span className="text-xs text-muted-foreground/50">×</span>

          <Input
            id={`quote-item-price-${item.id}`}
            aria-label={`Item ${index + 1} unit price`}
            className="w-24"
            inputMode="decimal"
            type="number"
            max="1000000"
            min="0"
            required
            step="0.01"
            value={item.unitPrice}
            onChange={(event) =>
              onUpdate(item.id, {
                unitPrice: event.currentTarget.value,
              })
            }
            placeholder="0.00"
            disabled={isPending}
          />

          <span className="hidden w-20 text-right text-sm font-medium tabular-nums text-foreground sm:inline-block">
            {formatMoney(safeQuantity * unitPriceInCents, currency)}
          </span>

          {showSaveToPricing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setConfirmSaveOpen(true)}
                  disabled={isPending || isSavingToPricing}
                >
                  <Bookmark className="size-3.5" />
                  <span className="sr-only">Save to pricing library</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save to pricing library</TooltipContent>
            </Tooltip>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(item.id)}
            disabled={isPending || !canRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Remove item {index + 1}</span>
          </Button>
        </div>
      </div>

      {/* AI review badge + reason (only when present) */}
      {(shouldShowLineItemReviewBadge(item.aiReview) || item.aiReview?.reason) ? (
        <div className="mt-1.5 flex items-center gap-2 pl-6">
          {shouldShowLineItemReviewBadge(item.aiReview) ? (
            <AiReviewBadge review={item.aiReview} />
          ) : null}
          {item.aiReview?.reason ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {item.aiReview.reason}
            </p>
          ) : null}
        </div>
      ) : null}

      <AlertDialog onOpenChange={setConfirmSaveOpen} open={confirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save to pricing library?</AlertDialogTitle>
            <AlertDialogDescription>
              This adds a reusable pricing block for &ldquo;
              {item.description.trim().slice(0, 80)}
              {item.description.trim().length > 80 ? "…" : ""}
              &rdquo; at {formatMoney(unitPriceInCents, currency)} per unit. You
              can reuse it on future quotes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingToPricing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingToPricing}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmSaveToPricing();
              }}
            >
              {isSavingToPricing ? (
                <>
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                  Saving...
                </>
              ) : (
                "Save to pricing"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
