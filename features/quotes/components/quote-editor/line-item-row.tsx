"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EditorLineItem } from "./types";

type AiReview = NonNullable<EditorLineItem["aiReview"]>;

const REVIEW_BADGE_LABELS: Record<AiReview["reviewStatus"], string> = {
  matched: "Matched",
  calculated: "Calculated",
  needs_review: "Needs pricing",
  no_pricing_found: "Needs pricing",
};

const REVIEW_BADGE_CLASS_NAMES: Record<AiReview["reviewStatus"], string> = {
  matched:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200",
  calculated:
    "border-blue-500/30 bg-blue-500/15 text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/12 dark:text-blue-200",
  needs_review:
    "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200",
  no_pricing_found:
    "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200",
};

export function AiReviewBadge({ review }: { review: AiReview }) {
  const baseLabel = REVIEW_BADGE_LABELS[review.reviewStatus];
  const sourceHint = review.pricingSourceLabel
    ? ` · ${review.pricingSourceLabel}`
    : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        REVIEW_BADGE_CLASS_NAMES[review.reviewStatus],
      )}
      title={review.reason || undefined}
    >
      {baseLabel}
      {sourceHint}
    </span>
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
  formatMoney,
}: {
  item: EditorLineItem;
  index: number;
  currency: string;
  unitPriceInCents: number;
  safeQuantity: number;
  isPending: boolean;
  canRemove: boolean;
  onUpdate: (id: string, patch: Partial<EditorLineItem>) => void;
  onRemove: (id: string) => void;
  formatMoney: (cents: number, currency: string) => string;
}) {
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
        "soft-panel relative overflow-hidden rounded-xl p-5",
        item.isAiGenerated && "ai-glow-border",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              aria-label={`Reorder item ${index + 1}`}
              className="shrink-0 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
              type="button"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <p className="text-sm font-medium text-foreground">
              Item {index + 1}
            </p>
            {item.aiReview?.reviewStatus ? (
              <AiReviewBadge review={item.aiReview} />
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onRemove(item.id)}
            disabled={isPending || !canRemove}
          >
            <Trash2 data-icon="inline-start" />
            <span className="sr-only">Remove line item</span>
          </Button>
        </div>

        {item.aiReview && item.aiReview.reason ? (
          <p className="text-xs leading-5 text-muted-foreground">
            <span className="meta-label mr-1">AI</span>
            {item.aiReview.reason}
          </p>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`quote-item-description-${item.id}`}>
              Description
            </FieldLabel>
            <FieldContent>
              <Input
                id={`quote-item-description-${item.id}`}
                maxLength={400}
                value={item.description}
                onChange={(event) =>
                  onUpdate(item.id, {
                    description: event.currentTarget.value,
                  })
                }
                placeholder="Logo concept package"
                required
                disabled={isPending}
              />
            </FieldContent>
          </Field>

          <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
            <Field>
              <FieldLabel htmlFor={`quote-item-quantity-${item.id}`}>
                Quantity
              </FieldLabel>
              <FieldContent>
                <Input
                  id={`quote-item-quantity-${item.id}`}
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
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor={`quote-item-price-${item.id}`}>
                Unit price
              </FieldLabel>
              <FieldContent>
                <Input
                  id={`quote-item-price-${item.id}`}
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
              </FieldContent>
            </Field>

            <div className="info-tile bg-muted/20 px-4 py-3 shadow-none">
              <p className="meta-label">Line total</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatMoney(safeQuantity * unitPriceInCents, currency)}
              </p>
            </div>
          </div>
        </FieldGroup>
      </div>
    </div>
  );
}
