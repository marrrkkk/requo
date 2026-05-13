"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ImporterPlanContext } from "@/features/importer/types";
import { cn } from "@/lib/utils";

export type KnowledgeDraft = {
  draftId: string;
  title: string;
  content: string;
};

type ImporterKnowledgeReviewProps = {
  items: KnowledgeDraft[];
  onChange: (items: KnowledgeDraft[]) => void;
  sourceName: string;
  warnings: string[];
  planContext: ImporterPlanContext;
  /**
   * Increments each time the user tries to commit while over the plan limit.
   * When this changes we scroll the last over-limit item into view and pulse
   * its border so the user sees which rows need to be removed.
   */
  overLimitNonce: number;
};

export function ImporterKnowledgeReview({
  items,
  onChange,
  sourceName,
  warnings,
  planContext,
  overLimitNonce,
}: ImporterKnowledgeReviewProps) {
  const { existingCount, limit } = planContext;
  const selectedCount = items.length;
  const totalAfterImport = existingCount + selectedCount;
  const overBy = limit === null ? 0 : Math.max(0, totalAfterImport - limit);
  const isOverLimit = overBy > 0;

  /** Indices (from the end) that cannot fit. These get a red highlight. */
  const overLimitIndexes = useMemo(() => {
    if (overBy === 0) return new Set<number>();

    const set = new Set<number>();

    for (let i = items.length - overBy; i < items.length; i += 1) {
      if (i >= 0) set.add(i);
    }

    return set;
  }, [items.length, overBy]);

  const lastItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOverLimit || overLimitNonce === 0) return;

    lastItemRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [overLimitNonce, isOverLimit]);

  function updateItem(draftId: string, patch: Partial<KnowledgeDraft>) {
    onChange(items.map((item) => (item.draftId === draftId ? { ...item, ...patch } : item)));
  }

  function removeItem(draftId: string) {
    onChange(items.filter((item) => item.draftId !== draftId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          AI extracted {items.length} knowledge {items.length === 1 ? "item" : "items"} from{" "}
          <span className="font-medium text-foreground">{sourceName}</span>. Edit, remove, or keep
          as-is before importing.
        </p>
        <p className="text-xs text-muted-foreground">
          You currently have {existingCount} saved{" "}
          {limit === null ? (
            "(unlimited on your plan)"
          ) : (
            <>
              of <span className="font-medium text-foreground">{limit}</span> allowed by your plan
            </>
          )}
          {selectedCount > 0
            ? `. After this import you would have ${totalAfterImport}.`
            : "."}
        </p>
      </div>

      {isOverLimit ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {overBy} item{overBy === 1 ? "" : "s"} over your plan limit
          </AlertTitle>
          <AlertDescription>
            Remove the highlighted {overBy === 1 ? "item" : "items"} at the bottom of the list, or
            upgrade your plan to import all of them.
          </AlertDescription>
        </Alert>
      ) : null}

      {warnings.length ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {items.length ? (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isOver = overLimitIndexes.has(index);

            return (
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-lg border bg-card px-4 py-4 transition-[border-color,background-color] duration-300",
                  isOver
                    ? "border-destructive/70 bg-destructive/5 ring-1 ring-destructive/30"
                    : "border-border/70",
                  isOver && overLimitNonce > 0 && "animate-pulse-border",
                )}
                key={item.draftId}
                ref={isLast ? lastItemRef : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      isOver ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    Item {index + 1}
                    {isOver ? " — over plan limit" : ""}
                  </span>
                  <Button
                    aria-label="Remove this item"
                    onClick={() => removeItem(item.draftId)}
                    size="icon-sm"
                    type="button"
                    variant={isOver ? "destructive" : "ghost"}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <FieldContent>
                    <Input
                      maxLength={200}
                      onChange={(event) =>
                        updateItem(item.draftId, { title: event.target.value })
                      }
                      placeholder="Short title"
                      value={item.title}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Content</FieldLabel>
                  <FieldContent>
                    <Textarea
                      maxLength={4000}
                      onChange={(event) =>
                        updateItem(item.draftId, { content: event.target.value })
                      }
                      placeholder="Knowledge content"
                      rows={4}
                      value={item.content}
                    />
                  </FieldContent>
                </Field>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/80 px-6 py-10 text-center text-sm text-muted-foreground">
          All items removed. Go back to pick a different file.
        </div>
      )}
    </div>
  );
}
