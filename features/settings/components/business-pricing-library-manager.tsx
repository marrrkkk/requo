"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QuoteLibraryEntryCard } from "@/features/quotes/components/quote-library-entry-card";
import { QuoteLibraryEntryForm } from "@/features/quotes/components/quote-library-entry-form";
import type {
  DashboardQuoteLibraryEntry,
  QuoteLibraryActionState,
  QuoteLibraryDeleteActionState,
  QuoteLibraryEntryKind,
} from "@/features/quotes/types";

type BusinessPricingLibraryManagerProps = {
  quoteLibrary: DashboardQuoteLibraryEntry[];
  createAction: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  updateAction: (
    entryId: string,
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  deleteAction: (
    entryId: string,
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
};

export function BusinessPricingLibraryManager({
  quoteLibrary,
  createAction,
  updateAction,
  deleteAction,
}: BusinessPricingLibraryManagerProps) {
  const pricingBlocks = quoteLibrary.filter((entry) => entry.kind === "block");
  const servicePackages = quoteLibrary.filter((entry) => entry.kind === "package");
  const [activeCreateKind, setActiveCreateKind] =
    useState<QuoteLibraryEntryKind | null>(null);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <PricingEntrySection
        createAction={createAction}
        deleteAction={deleteAction}
        entries={pricingBlocks}
        isCreateOpen={activeCreateKind === "block"}
        kind="block"
        onCreateOpenChange={(open) =>
          setActiveCreateKind(open ? "block" : null)
        }
        updateAction={updateAction}
      />

      <PricingEntrySection
        createAction={createAction}
        deleteAction={deleteAction}
        entries={servicePackages}
        isCreateOpen={activeCreateKind === "package"}
        kind="package"
        onCreateOpenChange={(open) =>
          setActiveCreateKind(open ? "package" : null)
        }
        updateAction={updateAction}
      />
    </div>
  );
}

function PricingEntrySection({
  createAction,
  deleteAction,
  entries,
  isCreateOpen,
  kind,
  onCreateOpenChange,
  updateAction,
}: {
  createAction: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  deleteAction: (
    entryId: string,
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
  entries: DashboardQuoteLibraryEntry[];
  isCreateOpen: boolean;
  kind: QuoteLibraryEntryKind;
  onCreateOpenChange: (open: boolean) => void;
  updateAction: (
    entryId: string,
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
}) {
  const isBlock = kind === "block";
  const title = isBlock ? "Pricing blocks" : "Service packages";
  const createLabel = isBlock ? "Add pricing block" : "Add package";
  const submitLabel = "Save pricing entry";
  const submitPendingLabel = "Saving pricing entry...";
  const isCreateVisible = isCreateOpen || entries.length === 0;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>

      <div className="section-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {entries.length} saved
            </p>
          </div>
          {entries.length ? (
            <div className="w-full shrink-0 sm:w-auto">
              <Button
                className="w-full sm:w-auto"
                onClick={() => onCreateOpenChange(!isCreateVisible)}
                type="button"
                variant={isCreateVisible ? "secondary" : "outline"}
              >
                {isCreateVisible ? (
                  "Close"
                ) : (
                  <>
                    <Plus data-icon="inline-start" />
                    {createLabel}
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {isCreateVisible ? (
            <div className="border-b border-border/70 pb-5">
              <QuoteLibraryEntryForm
                action={createAction}
                fixedKind={kind}
                idPrefix={`quote-library-create-${kind}`}
                onSuccess={() => onCreateOpenChange(false)}
                submitLabel={submitLabel}
                submitPendingLabel={submitPendingLabel}
              />
            </div>
          ) : null}

          {entries.length ? (
            <div className="flex flex-col gap-4">
              {entries.map((entry, index) => (
                <QuoteLibraryEntryCard
                  action={updateAction.bind(null, entry.id)}
                  animationDelayMs={Math.min(index * 45, 180)}
                  deleteAction={deleteAction.bind(null, entry.id)}
                  entry={entry}
                  key={entry.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                {isBlock ? "No pricing blocks saved yet." : "No packages saved yet."}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isBlock
                  ? "Create your first pricing block."
                  : "Create your first package."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
