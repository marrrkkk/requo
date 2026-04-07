"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PencilLine } from "lucide-react";

import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
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
  getQuoteLibraryEntryKindLabel,
} from "@/features/quotes/utils";
import { cn } from "@/lib/utils";

type QuoteLibraryEntryCardProps = {
  action: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  currency: string;
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
  currency,
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

  return (
    <Card
      className="motion-card-enter motion-lift gap-0 border-border/75 bg-card/97"
      style={motionStyle}
    >
      <CardHeader className="gap-3 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{entry.name}</CardTitle>
              <DashboardMetaPill>{getQuoteLibraryEntryKindLabel(entry.kind)}</DashboardMetaPill>
              <DashboardMetaPill>
                {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
              </DashboardMetaPill>
            </div>
            <CardDescription>
              Updated {formatQuoteDateTime(entry.updatedAt)}
            </CardDescription>
          </div>

          <Button
            aria-expanded={isEditing}
            className="shrink-0"
            type="button"
            size="sm"
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
            {isEditing ? "Close editor" : "Edit entry"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-0">
        {entry.description ? (
          <div className="soft-panel p-4 shadow-none">
            <p className="text-sm leading-7 text-foreground">{entry.description}</p>
          </div>
        ) : null}

        <div className="soft-panel p-4 shadow-none">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-foreground">Saved items</p>
            <p className="text-sm font-semibold text-foreground">
              {formatQuoteMoney(entry.totalInCents, currency)}
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {entry.items.map((item) => (
              <div
                className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/80 px-4 py-3"
                key={item.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty {item.quantity} x {formatQuoteMoney(item.unitPriceInCents, currency)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-foreground">
                  {formatQuoteMoney(item.quantity * item.unitPriceInCents, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="motion-disclosure" data-open={isEditorVisible}>
          <div className="motion-disclosure-inner">
            {shouldRenderEditor ? (
              <div className="motion-card-enter pt-1">
                <QuoteLibraryEntryForm
                  action={action}
                  currency={currency}
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
                  submitLabel="Save entry"
                  submitPendingLabel="Saving entry..."
                  onSuccess={closeEditor}
                  idPrefix={`quote-library-entry-${entry.id}`}
                />
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        <QuoteLibraryEntryDeleteButton action={deleteAction} />
      </CardFooter>
    </Card>
  );
}
