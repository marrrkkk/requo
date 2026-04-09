"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuoteLibraryEntryDeleteButton } from "@/features/quotes/components/quote-library-entry-delete-button";
import { QuoteLibraryEntryForm } from "@/features/quotes/components/quote-library-entry-form";
import type {
  DashboardQuoteLibraryEntry,
  QuoteLibraryActionState,
  QuoteLibraryDeleteActionState,
} from "@/features/quotes/types";
import {
  centsToMoneyInput,
  formatQuoteDateTime,
  formatQuoteMoney,
} from "@/features/quotes/utils";
import { cn } from "@/lib/utils";

type QuoteLibraryEntryCardProps = {
  action: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  deleteAction: (
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
  entry: DashboardQuoteLibraryEntry;
  animationDelayMs?: number;
};

const EDITOR_TRANSITION_DURATION_MS = 220;

export function QuoteLibraryEntryCard({
  action,
  animationDelayMs,
  deleteAction,
  entry,
}: QuoteLibraryEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [shouldRenderEditor, setShouldRenderEditor] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  function openEditor() {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setShouldRenderEditor(true);
    setIsEditing(true);

    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
    }

    openFrameRef.current = window.requestAnimationFrame(() => {
      setIsEditorVisible(true);
      openFrameRef.current = null;
    });
  }

  function closeEditor() {
    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    setIsEditing(false);
    setIsEditorVisible(false);

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setShouldRenderEditor(false);
      closeTimeoutRef.current = null;
    }, EDITOR_TRANSITION_DURATION_MS);
  }

  function toggleEditor() {
    if (isEditing) {
      closeEditor();
      return;
    }

    openEditor();
  }

  const motionStyle = animationDelayMs
    ? ({ animationDelay: `${animationDelayMs}ms` } as CSSProperties)
    : undefined;
  const entryLabel = entry.kind === "block" ? "block" : "package";
  const entryMetaLabel = entry.kind === "block" ? "Block" : "Package";

  return (
    <Card
      className="motion-card-enter motion-lift gap-0 border-border/75 bg-card/97"
      style={motionStyle}
    >
      <CardHeader className="gap-3 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-2">
            <CardTitle className="text-xl">
              {entry.name}
            </CardTitle>
            <CardDescription>
              {entryMetaLabel} · {entry.itemCount}{" "}
              {entry.itemCount === 1 ? "item" : "items"} · Updated{" "}
              {formatQuoteDateTime(entry.updatedAt)}
            </CardDescription>
          </div>

          <Button
            aria-expanded={isEditing}
            className="shrink-0"
            size="sm"
            type="button"
            variant="outline"
            onClick={toggleEditor}
          >
            <PencilLine
              className={cn(
                "transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
                isEditing && "rotate-90 text-primary",
              )}
              data-icon="inline-start"
            />
            {isEditing ? `Close ${entryLabel} editor` : `Edit ${entryLabel}`}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-0">
        <div className="soft-panel p-4 shadow-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {entry.itemCount === 1 ? "Saved item" : "Saved items"}
              </p>
              <p className="text-xs text-muted-foreground">{entry.currency}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatQuoteMoney(entry.totalInCents, entry.currency)}
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background/80">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] gap-3 border-b border-border/70 bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span>Qty</span>
              <span>Price</span>
            </div>
            <div className="flex flex-col">
              {entry.items.map((item) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
                  key={item.id}
                >
                  <p className="min-w-0 text-sm text-foreground">
                    {item.description}
                  </p>
                  <p className="text-sm text-foreground">{item.quantity}</p>
                  <p className="text-sm text-foreground">
                    {formatQuoteMoney(item.unitPriceInCents, entry.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="motion-disclosure" data-open={isEditorVisible}>
          <div className="motion-disclosure-inner">
            {shouldRenderEditor ? (
              <div className="motion-card-enter pt-1">
                <QuoteLibraryEntryForm
                  action={action}
                  fixedKind={entry.kind}
                  idPrefix={`quote-library-entry-${entry.id}`}
                  initialValues={{
                    kind: entry.kind,
                    name: entry.name,
                    description: entry.description ?? "",
                    items: entry.items.map((item) => ({
                      id: item.id,
                      description: item.description,
                      quantity: String(item.quantity),
                      unitPrice: centsToMoneyInput(item.unitPriceInCents),
                    })),
                  }}
                  onSuccess={closeEditor}
                  submitLabel={`Save ${entryLabel}`}
                  submitPendingLabel={`Saving ${entryLabel}...`}
                />
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        <QuoteLibraryEntryDeleteButton
          action={deleteAction}
          label={`Delete ${entryLabel}`}
        />
      </CardFooter>
    </Card>
  );
}
