"use client";

import { useState, useTransition } from "react";
import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type {
  DashboardMemory,
  DashboardMemorySummary,
  MemoryActionState,
  MemoryDeleteActionState,
} from "@/features/memory/types";

type BusinessMemoryManagerProps = {
  memoryData: {
    memories: DashboardMemory[];
  };
  memorySummary: DashboardMemorySummary;
  createAction: (
    state: MemoryActionState,
    formData: FormData,
  ) => Promise<MemoryActionState>;
  updateAction: (
    memoryId: string,
    state: MemoryActionState,
    formData: FormData,
  ) => Promise<MemoryActionState>;
  deleteAction: (
    memoryId: string,
    state: MemoryDeleteActionState,
    formData: FormData,
  ) => Promise<MemoryDeleteActionState>;
};

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; memory: DashboardMemory }
  | null;

export function BusinessMemoryManager({
  memoryData,
  memorySummary,
  createAction,
  updateAction,
  deleteAction,
}: BusinessMemoryManagerProps) {
  const { memories } = memoryData;
  const { memoryCount, limit } = memorySummary;
  const isAtLimit = limit !== null && memoryCount >= limit;
  const canAdd = !isAtLimit;
  const [editorState, setEditorState] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardMemory | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          description="Items AI uses as context"
          label="Knowledge entries"
          value={memoryCount}
        />
        <StatCard
          description={
            limit === null ? "No limit on your plan" : "Plan limit"
          }
          label="Limit"
          value={limit === null ? "∞" : limit}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {memoryCount} of {limit === null ? "unlimited" : limit}{" "}
          {memoryCount === 1 ? "entry" : "entries"} used
        </p>
        <Button
          disabled={!canAdd}
          onClick={() => setEditorState({ mode: "create" })}
          size="sm"
          type="button"
        >
          <Plus data-icon="inline-start" />
          {canAdd ? "Add knowledge" : "Limit reached"}
        </Button>
      </div>

      {/* Entries list */}
      {memories.length ? (
        <div className="overflow-hidden rounded-xl border border-border/75">
          <div className="divide-y divide-border/60">
            {memories.map((memory) => (
              <KnowledgeRow
                key={memory.id}
                memory={memory}
                onEdit={() => setEditorState({ mode: "edit", memory })}
                onDelete={() => setDeleteTarget(memory)}
              />
            ))}
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          description="Add your first knowledge item to help AI draft better replies and quotes."
          icon={BookOpen}
          title="No knowledge yet"
          variant="section"
        />
      )}

      {/* Editor dialog */}
      <Dialog
        open={editorState !== null}
        onOpenChange={(open) => {
          if (!open) setEditorState(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {editorState ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editorState.mode === "create" ? "Add knowledge" : "Edit knowledge"}
                </DialogTitle>
                <DialogDescription>
                  {editorState.mode === "create"
                    ? "Context that AI uses when drafting replies and quotes."
                    : "Update the context provided to AI drafts."}
                </DialogDescription>
              </DialogHeader>
              <KnowledgeForm
                action={
                  editorState.mode === "create"
                    ? createAction
                    : updateAction.bind(null, editorState.memory.id)
                }
                idPrefix={
                  editorState.mode === "create"
                    ? "knowledge-create"
                    : `knowledge-edit-${editorState.memory.id}`
                }
                initialData={editorState.mode === "edit" ? editorState.memory : undefined}
                onSuccess={() => setEditorState(null)}
                submitLabel={
                  editorState.mode === "create" ? "Create" : "Save changes"
                }
                submitPendingLabel="Saving..."
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {deleteTarget ? (
        <DeleteConfirmDialog
          deleteAction={deleteAction}
          memory={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/75 bg-card/97 p-4">
      <div className="rounded-lg bg-muted p-2">
        <BookOpen className="size-4 text-muted-foreground" />
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

function KnowledgeForm({
  action,
  idPrefix,
  initialData,
  onSuccess,
  submitLabel,
  submitPendingLabel,
}: {
  action: (state: MemoryActionState, formData: FormData) => Promise<MemoryActionState>;
  idPrefix?: string;
  initialData?: DashboardMemory;
  onSuccess?: () => void;
  submitLabel: string;
  submitPendingLabel: string;
}) {
  const [isPending, startPending] = useTransition();
  const [formState, setFormState] = useState<MemoryActionState>({});

  const handleSubmit = async (formData: FormData) => {
    startPending(async () => {
      const result = await action(formState, formData);
      setFormState(result);
      if (result.success && onSuccess) {
        onSuccess();
      }
    });
  };

  return (
    <form action={handleSubmit}>
      <DialogBody className="flex flex-col gap-4">
        <Field data-invalid={Boolean(formState.fieldErrors?.title)}>
          <FieldLabel htmlFor={`${idPrefix}-title`}>Title</FieldLabel>
          <FieldContent>
            <Input
              aria-invalid={Boolean(formState.fieldErrors?.title)}
              defaultValue={initialData?.title}
              disabled={isPending}
              id={`${idPrefix}-title`}
              name="title"
              placeholder="e.g., Pricing policy"
            />
          </FieldContent>
          <FieldError>{formState.fieldErrors?.title}</FieldError>
        </Field>

        <Field data-invalid={Boolean(formState.fieldErrors?.content)}>
          <FieldLabel htmlFor={`${idPrefix}-content`}>Content</FieldLabel>
          <FieldContent>
            <Textarea
              aria-invalid={Boolean(formState.fieldErrors?.content)}
              defaultValue={initialData?.content}
              disabled={isPending}
              id={`${idPrefix}-content`}
              name="content"
              placeholder="Details about your pricing, policies, or common Q&A..."
              rows={6}
            />
          </FieldContent>
          <FieldDescription>
            Included as context when AI drafts replies.
          </FieldDescription>
          <FieldError>{formState.fieldErrors?.content}</FieldError>
        </Field>

        {formState.error ? (
          <p className="text-sm text-destructive">{formState.error}</p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner aria-hidden="true" data-icon="inline-start" />
              {submitPendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function KnowledgeRow({
  memory,
  onDelete,
  onEdit,
}: {
  memory: DashboardMemory;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/20">
      <div className="rounded-lg bg-muted/60 p-2">
        <BookOpen className="size-4 text-muted-foreground" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {memory.title}
        </p>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {memory.content}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Actions for ${memory.title}`}
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
  memory,
  onClose,
}: {
  deleteAction: (
    memoryId: string,
    state: MemoryDeleteActionState,
    formData: FormData,
  ) => Promise<MemoryDeleteActionState>;
  memory: DashboardMemory;
  onClose: () => void;
}) {
  const [isPending, startPending] = useTransition();
  const [state, setState] = useState<MemoryDeleteActionState>({});

  const handleDelete = async () => {
    startPending(async () => {
      const result = await deleteAction(memory.id, state, new FormData());
      setState(result);
      if (!result.error) {
        onClose();
      }
    });
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete knowledge?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes &ldquo;{memory.title}&rdquo;. AI will no
            longer use this context.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.error ? (
          <p className="px-6 text-sm text-destructive">{state.error}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button disabled={isPending} type="button" variant="outline">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={isPending}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isPending ? (
                <>
                  <Spinner aria-hidden="true" data-icon="inline-start" />
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
  );
}
