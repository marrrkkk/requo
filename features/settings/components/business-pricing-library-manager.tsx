"use client";

import { useMemo, useState } from "react";
import {
  FileUp,
  FileText,
  Layers,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveOverlay,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
} from "@/components/ui/responsive-overlay";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImporterDialog } from "@/features/importer/components/importer-dialog";
import type { KnowledgeDraft } from "@/features/importer/components/importer-knowledge-review";
import type { PricingDraft } from "@/features/importer/components/importer-pricing-review";
import type {
  ImporterAnalyzeResult,
  ImporterCommitResult,
  ImporterDestination,
} from "@/features/importer/types";
import {
  QuoteLibraryEntryForm,
  type QuoteLibraryBlockReference,
} from "@/features/quotes/components/quote-library-entry-form";
import {
  centsToMoneyInput,
  formatQuoteMoney,
} from "@/features/quotes/utils";
import type {
  DashboardQuoteLibraryEntry,
  QuoteLibraryActionState,
  QuoteLibraryDeleteActionState,
  QuoteLibraryEntryKind,
} from "@/features/quotes/types";
import { useAnimatedList, type MotionState } from "@/hooks/use-animated-list";
import type { OptimisticActionResult } from "@/hooks/use-optimistic-mutation";

type BusinessPricingLibraryManagerProps = {
  quoteLibrary: DashboardQuoteLibraryEntry[];
  pricingLimit: number | null;
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
  importerEnabled: boolean;
  analyzeImportAction: (
    destination: ImporterDestination,
    formData: FormData,
  ) => Promise<ImporterAnalyzeResult>;
  commitKnowledgeImportAction: (payload: {
    sourceName: string;
    items: KnowledgeDraft[];
  }) => Promise<ImporterCommitResult>;
  commitPricingImportAction: (payload: {
    sourceName: string;
    entries: PricingDraft[];
  }) => Promise<ImporterCommitResult>;
};

type FilterTab = "all" | "block" | "package";

type EditorState =
  | { mode: "create"; kind: QuoteLibraryEntryKind }
  | { mode: "edit"; entry: DashboardQuoteLibraryEntry }
  | null;

export function BusinessPricingLibraryManager({
  quoteLibrary,
  pricingLimit,
  createAction,
  updateAction,
  deleteAction,
  importerEnabled,
  analyzeImportAction,
  commitKnowledgeImportAction,
  commitPricingImportAction,
}: BusinessPricingLibraryManagerProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<DashboardQuoteLibraryEntry | null>(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const totalCount = quoteLibrary.length;
  const isAtLimit = pricingLimit !== null && totalCount >= pricingLimit;

  const blockCount = quoteLibrary.filter((e) => e.kind === "block").length;
  const packageCount = quoteLibrary.filter((e) => e.kind === "package").length;
  const availableBlocks = useMemo<QuoteLibraryBlockReference[]>(
    () =>
      quoteLibrary
        .filter((entry) => entry.kind === "block")
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          currency: entry.currency,
          totalInCents: entry.totalInCents,
          items: entry.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
          })),
        })),
    [quoteLibrary],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return quoteLibrary;
    return quoteLibrary.filter((e) => e.kind === filter);
  }, [quoteLibrary, filter]);

  const { items: animatedFiltered, getMotionState, removeItem } = useAnimatedList(filtered);

  function openCreate(kind: QuoteLibraryEntryKind) {
    setEditorState({ mode: "create", kind });
  }

  function openEdit(entry: DashboardQuoteLibraryEntry) {
    setEditorState({ mode: "edit", entry });
  }

  function closeEditor() {
    setEditorState(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Layers}
          label="Pricing blocks"
          value={blockCount}
          description="Reusable line items"
        />
        <StatCard
          icon={Package}
          label="Service packages"
          value={packageCount}
          description="Bundled services"
        />
        <StatCard
          icon={Layers}
          label="Plan usage"
          value={`${totalCount}/${pricingLimit ?? "∞"}`}
          description={isAtLimit ? "Limit reached" : "Entries used"}
        />
      </div>

      {/* Toolbar: tabs + add button */}
      <div className="flex flex-col gap-3">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="all">
              All <span className="ml-1.5 text-muted-foreground">{quoteLibrary.length}</span>
            </TabsTrigger>
            <TabsTrigger value="block">
              Blocks <span className="ml-1.5 text-muted-foreground">{blockCount}</span>
            </TabsTrigger>
            <TabsTrigger value="package">
              Packages <span className="ml-1.5 text-muted-foreground">{packageCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          {importerEnabled ? (
            <Button
              disabled={isAtLimit}
              onClick={() => setImporterOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <FileUp data-icon="inline-start" />
              Import from file
            </Button>
          ) : null}
          <Button
            disabled={isAtLimit}
            onClick={() => openCreate("block")}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus data-icon="inline-start" />
            New block
          </Button>
          <Button
            disabled={isAtLimit}
            onClick={() => openCreate("package")}
            size="sm"
            type="button"
          >
            <Plus data-icon="inline-start" />
            New package
          </Button>
        </div>
      </div>

      {/* Entries list */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/75">
          <div className="divide-y divide-border/60">
            {animatedFiltered.map((entry) => (
              <EntryRow
                entry={entry}
                key={entry.id}
                motionState={getMotionState(entry.id)}
                onDelete={() => setDeleteTarget(entry)}
                onEdit={() => openEdit(entry)}
              />
            ))}
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          description={
            filter === "package"
              ? "Create your first package to bundle services together."
              : filter === "block"
                ? "Create your first pricing block to speed up quoting."
                : "Add your first pricing block or service package to get started."
          }
          icon={filter === "package" ? Package : Layers}
          title={
            filter === "package"
              ? "No packages yet"
              : filter === "block"
                ? "No blocks yet"
                : "Nothing saved yet"
          }
          variant="section"
        />
      )}

      {/* Editor dialog */}
      <ResponsiveOverlay
        open={editorState !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <ResponsiveOverlayContent className="sm:max-w-2xl">
          {editorState ? (
            <>
              <ResponsiveOverlayHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
                    {(editorState.mode === "create"
                      ? editorState.kind
                      : editorState.entry.kind) === "package" ? (
                      <Package className="size-5 text-muted-foreground" />
                    ) : (editorState.mode === "create"
                      ? editorState.kind
                      : editorState.entry.kind) === "template" ? (
                      <FileText className="size-5 text-muted-foreground" />
                    ) : (
                      <Layers className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <ResponsiveOverlayTitle>
                      {editorState.mode === "create" ? (
                        editorState.kind === "package" ? (
                          "Create service package"
                        ) : editorState.kind === "template" ? (
                          "Create quote template"
                        ) : (
                          "Create pricing block"
                        )
                      ) : editorState.entry.kind === "package" ? (
                        "Edit service package"
                      ) : editorState.entry.kind === "template" ? (
                        "Edit quote template"
                      ) : (
                        "Edit pricing block"
                      )}
                    </ResponsiveOverlayTitle>
                    <ResponsiveOverlayDescription>
                      {editorState.mode === "create" &&
                      editorState.kind === "package"
                        ? "Bundle line items into a reusable package. Add them manually or import from saved blocks."
                        : editorState.mode === "create" &&
                            editorState.kind === "template"
                          ? "A full quote blueprint that pre-fills title, notes, terms, validity, and line items."
                          : editorState.mode === "create"
                            ? "A reusable line item you can drop into any quote with one click."
                            : "Update the details and line items."}
                    </ResponsiveOverlayDescription>
                  </div>
                </div>
              </ResponsiveOverlayHeader>

              <div
                className="contents"
                key={
                  editorState.mode === "create"
                    ? `create-${editorState.kind}`
                    : `edit-${editorState.entry.id}`
                }
              >
                <QuoteLibraryEntryForm
                  action={
                    editorState.mode === "create"
                      ? createAction
                      : updateAction.bind(null, editorState.entry.id)
                  }
                  availableBlocks={
                    editorState.mode === "create" &&
                    editorState.kind === "package"
                      ? availableBlocks
                      : undefined
                  }
                  fixedKind={
                    editorState.mode === "create"
                      ? editorState.kind
                      : editorState.entry.kind
                  }
                  idPrefix={
                    editorState.mode === "create"
                      ? `quote-library-create-${editorState.kind}`
                      : `quote-library-edit-${editorState.entry.id}`
                  }
                  initialValues={
                    editorState.mode === "edit"
                      ? {
                          kind: editorState.entry.kind,
                          name: editorState.entry.name,
                          description: editorState.entry.description ?? "",
                          title: editorState.entry.title ?? "",
                          notes: editorState.entry.notes ?? "",
                          terms: editorState.entry.terms ?? "",
                          validityDays: editorState.entry.validityDays != null
                            ? String(editorState.entry.validityDays)
                            : "14",
                          items: editorState.entry.items.map((item) => ({
                            id: item.id,
                            description: item.description,
                            quantity: String(item.quantity),
                            unitPrice: centsToMoneyInput(item.unitPriceInCents),
                          })),
                        }
                      : undefined
                  }
                  layout="dialog"
                  onCancel={closeEditor}
                  onSuccess={closeEditor}
                  submitLabel={
                    editorState.mode === "create" ? "Create" : "Save changes"
                  }
                  submitPendingLabel="Saving..."
                />
              </div>
            </>
          ) : null}
        </ResponsiveOverlayContent>
      </ResponsiveOverlay>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        deleteAction={deleteAction}
        entry={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onOptimisticRemove={removeItem}
      />

      {/* File importer */}
      {importerEnabled ? (
        <ImporterDialog
          analyzeAction={analyzeImportAction}
          commitKnowledgeAction={commitKnowledgeImportAction}
          commitPricingAction={commitPricingImportAction}
          destination="pricing"
          onOpenChange={setImporterOpen}
          open={importerOpen}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/75 bg-card/97 p-4">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  motionState,
  onDelete,
  onEdit,
}: {
  entry: DashboardQuoteLibraryEntry;
  motionState?: MotionState;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const isPackage = entry.kind === "package";
  const isTemplate = entry.kind === "template";
  const Icon = isTemplate ? FileText : isPackage ? Package : Layers;

  return (
    <div className="motion-list-item group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:items-center sm:gap-4 sm:px-5 sm:py-4" data-motion-state={motionState}>
      <div className="mt-0.5 rounded-lg bg-muted/60 p-2 sm:mt-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {entry.name}
            </p>
            <Badge variant="outline" className="shrink-0 text-[0.65rem]">
              {isTemplate ? "Template" : isPackage ? "Package" : "Block"}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
            {(isPackage || isTemplate) && entry.items.length > 0 ? (
              <span>
                {" · "}
                {entry.items
                  .slice(0, 2)
                  .map((i) => i.description)
                  .join(", ")}
                {entry.items.length > 2 ? ` +${entry.items.length - 2}` : ""}
              </span>
            ) : null}
            {isTemplate && entry.validityDays ? (
              <span> · {entry.validityDays} day validity</span>
            ) : null}
          </p>
        </div>

        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {formatQuoteMoney(entry.totalInCents, entry.currency)}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Actions for ${entry.name}`}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DeleteConfirmDialog({
  deleteAction,
  entry,
  onClose,
  onOptimisticRemove,
}: {
  deleteAction: (
    entryId: string,
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
  entry: DashboardQuoteLibraryEntry | null;
  onClose: () => void;
  onOptimisticRemove: (
    id: string,
    mutation?: () => Promise<OptimisticActionResult>,
  ) => void;
}) {
  if (!entry) return null;
  return (
    <DeleteConfirmDialogInner
      deleteAction={deleteAction}
      entry={entry}
      onClose={onClose}
      onOptimisticRemove={onOptimisticRemove}
    />
  );
}

function DeleteConfirmDialogInner({
  deleteAction,
  entry,
  onClose,
  onOptimisticRemove,
}: {
  deleteAction: (
    entryId: string,
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
  entry: DashboardQuoteLibraryEntry;
  onClose: () => void;
  onOptimisticRemove: (
    id: string,
    mutation?: () => Promise<OptimisticActionResult>,
  ) => void;
}) {
  function handleDelete() {
    onClose();
    onOptimisticRemove(entry.id, async () => {
      const result = await deleteAction(entry.id, {}, new FormData());
      return {
        error: result.error,
        success: result.success ? "Deleted" : undefined,
      };
    });
  }

  const kindLabel = entry.kind === "package" ? "package" : entry.kind === "template" ? "template" : "block";

  return (
    <AlertDialog
      open={Boolean(entry)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {kindLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes &ldquo;{entry.name}&rdquo; from your
            pricing library. Quotes already using this {kindLabel} are not
            affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleDelete} type="button" variant="destructive">
              {`Delete ${kindLabel}`}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
