"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Plus, Database } from "lucide-react";

import { DashboardEmptyState } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  const limitLabel = limit === null ? "Unlimited" : `${memoryCount} / ${limit}`;

  const canAdd = !isAtLimit;
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-foreground">Knowledge used</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {limitLabel}
          </p>
        </div>
        {canAdd ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus data-icon="inline-start" />
                Add knowledge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add knowledge</DialogTitle>
                <DialogDescription>
                  Add context for AI to use in drafts.
                </DialogDescription>
              </DialogHeader>
              <KnowledgeForm
                action={createAction}
                submitLabel="Save knowledge"
                submitPendingLabel="Saving..."
                idPrefix="knowledge-create"
                onSuccess={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled>Limit reached</Button>
        )}
      </div>

      <section className="section-panel p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Saved knowledge
            </h2>
            <p className="text-sm text-muted-foreground">
              Your business context for AI.
            </p>
          </div>

          {memories.length ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
              <div className="flex flex-col">
                {memories.map((memory, i) => (
                  <div
                    key={memory.id}
                    className={cn(i > 0 && "border-t border-border/70")}
                  >
                    <KnowledgeRow
                      memory={memory}
                      updateAction={updateAction.bind(null, memory.id)}
                      deleteAction={deleteAction.bind(null, memory.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DashboardEmptyState
              description="Add your first knowledge item to help AI draft better replies."
              icon={Database}
              title="No knowledge yet"
              variant="section"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function KnowledgeForm({
  action,
  submitLabel,
  submitPendingLabel,
  idPrefix,
  initialData,
  onSuccess,
}: {
  action: (state: MemoryActionState, formData: FormData) => Promise<MemoryActionState>;
  submitLabel: string;
  submitPendingLabel: string;
  idPrefix?: string;
  initialData?: DashboardMemory;
  onSuccess?: () => void;
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
              id={`${idPrefix}-title`}
              name="title"
              placeholder="e.g., Pricing policy"
              defaultValue={initialData?.title}
              disabled={isPending}
              aria-invalid={Boolean(formState.fieldErrors?.title)}
            />
          </FieldContent>
          <FieldError>{formState.fieldErrors?.title}</FieldError>
        </Field>

        <Field data-invalid={Boolean(formState.fieldErrors?.content)}>
          <FieldLabel htmlFor={`${idPrefix}-content`}>Content</FieldLabel>
          <FieldContent>
            <Textarea
              id={`${idPrefix}-content`}
              name="content"
              placeholder="Details about your pricing, policies, or common Q&A..."
              defaultValue={initialData?.content}
              rows={4}
              disabled={isPending}
              aria-invalid={Boolean(formState.fieldErrors?.content)}
            />
          </FieldContent>
          <FieldDescription>
            This will be included as context for AI drafts.
          </FieldDescription>
          <FieldError>{formState.fieldErrors?.content}</FieldError>
        </Field>

        {formState.error && (
          <p className="text-sm text-destructive">{formState.error}</p>
        )}

        {formState.success && (
          <p className="text-sm text-green-600">{formState.success}</p>
        )}
      </DialogBody>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
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
  updateAction,
  deleteAction,
}: {
  memory: DashboardMemory;
  updateAction: (state: MemoryActionState, formData: FormData) => Promise<MemoryActionState>;
  deleteAction: (state: MemoryDeleteActionState, formData: FormData) => Promise<MemoryDeleteActionState>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startPending] = useTransition();
  const [deleteState, setDeleteState] = useState<MemoryDeleteActionState>({});

  const handleDelete = async () => {
    startPending(async () => {
      const result = await deleteAction(deleteState, new FormData());
      setDeleteState(result);
      if (!result.error) {
        setIsDeleting(false);
      }
    });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/30">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {memory.title}
          </p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-3">
            {memory.content}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                Edit knowledge
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setIsDeleting(true)}
                className="text-destructive focus:text-destructive"
              >
                Delete knowledge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit knowledge</DialogTitle>
            <DialogDescription>
              Update the context provided to AI drafts.
            </DialogDescription>
          </DialogHeader>
          <KnowledgeForm
            action={updateAction}
            initialData={memory}
            submitLabel="Save changes"
            submitPendingLabel="Saving..."
            idPrefix={`knowledge-edit-${memory.id}`}
            onSuccess={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete knowledge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this knowledge item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {deleteState.error && (
              <p className="text-sm text-destructive">{deleteState.error}</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleting(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <form action={handleDelete}>
              <Button variant="destructive" type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                    Deleting...
                  </>
                ) : (
                  "Delete knowledge"
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
