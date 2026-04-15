"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Plus, MessageSquareText } from "lucide-react";

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
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  DashboardReplySnippet,
  ReplySnippetActionState,
  ReplySnippetDeleteActionState,
} from "@/features/inquiries/reply-snippet-types";

type BusinessReplySnippetsManagerProps = {
  snippets: DashboardReplySnippet[];
  createAction: (
    state: ReplySnippetActionState,
    formData: FormData,
  ) => Promise<ReplySnippetActionState>;
  updateAction: (
    snippetId: string,
    state: ReplySnippetActionState,
    formData: FormData,
  ) => Promise<ReplySnippetActionState>;
  deleteAction: (
    snippetId: string,
    state: ReplySnippetDeleteActionState,
    formData: FormData,
  ) => Promise<ReplySnippetDeleteActionState>;
};

export function BusinessReplySnippetsManager({
  snippets,
  createAction,
  updateAction,
  deleteAction,
}: BusinessReplySnippetsManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/75 bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-foreground">Saved replies</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {snippets.length}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus data-icon="inline-start" />
              New reply
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create saved reply</DialogTitle>
              <DialogDescription>
                Add reusable text for qualification replies and follow-ups.
              </DialogDescription>
            </DialogHeader>
            <SnippetForm
              action={createAction}
              submitLabel="Save reply"
              submitPendingLabel="Saving..."
              idPrefix="snippet-create"
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <section className="section-panel p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Snippet library
            </h2>
            <p className="text-sm text-muted-foreground">
              Edit or reuse any saved reply.
            </p>
          </div>

          {snippets.length ? (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/50 shadow-sm">
              <div className="flex flex-col">
                {snippets.map((snippet, i) => (
                  <div
                    key={snippet.id}
                    className={cn(i > 0 && "border-t border-border/70")}
                  >
                    <SnippetRow
                      snippet={snippet}
                      updateAction={updateAction.bind(null, snippet.id)}
                      deleteAction={deleteAction.bind(null, snippet.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DashboardEmptyState
              description="Create one now to reuse it while qualifying leads and following up."
              icon={MessageSquareText}
              title="No saved replies yet"
              variant="section"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SnippetForm({
  action,
  submitLabel,
  submitPendingLabel,
  idPrefix,
  initialData,
  onSuccess,
}: {
  action: (state: ReplySnippetActionState, formData: FormData) => Promise<ReplySnippetActionState>;
  submitLabel: string;
  submitPendingLabel: string;
  idPrefix?: string;
  initialData?: DashboardReplySnippet;
  onSuccess?: () => void;
}) {
  const [isPending, startPending] = useTransition();
  const [formState, setFormState] = useState<ReplySnippetActionState>({});

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
              placeholder="e.g., Ask for dimensions"
              defaultValue={initialData?.title}
              maxLength={120}
              minLength={2}
              required
              disabled={isPending}
              aria-invalid={Boolean(formState.fieldErrors?.title)}
            />
          </FieldContent>
          <FieldError>{formState.fieldErrors?.title}</FieldError>
        </Field>

        <Field data-invalid={Boolean(formState.fieldErrors?.body)}>
          <FieldLabel htmlFor={`${idPrefix}-body`}>Snippet content</FieldLabel>
          <FieldContent>
            <Textarea
              id={`${idPrefix}-body`}
              name="body"
              placeholder="Thanks for reaching out! Before we can quote this accurately..."
              defaultValue={initialData?.body}
              rows={6}
              maxLength={2000}
              minLength={1}
              required
              disabled={isPending}
              aria-invalid={Boolean(formState.fieldErrors?.body)}
            />
          </FieldContent>
          <FieldError>{formState.fieldErrors?.body}</FieldError>
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

function SnippetRow({
  snippet,
  updateAction,
  deleteAction,
}: {
  snippet: DashboardReplySnippet;
  updateAction: (state: ReplySnippetActionState, formData: FormData) => Promise<ReplySnippetActionState>;
  deleteAction: (state: ReplySnippetDeleteActionState, formData: FormData) => Promise<ReplySnippetDeleteActionState>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startPending] = useTransition();
  const [deleteState, setDeleteState] = useState<ReplySnippetDeleteActionState>({});

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
            {snippet.title}
          </p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground line-clamp-3">
            {snippet.body}
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
                Edit snippet
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setIsDeleting(true)}
                className="text-destructive focus:text-destructive"
              >
                Delete snippet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit snippet</DialogTitle>
            <DialogDescription>
              Update your reusable saved reply.
            </DialogDescription>
          </DialogHeader>
          <SnippetForm
            action={updateAction}
            initialData={snippet}
            submitLabel="Save changes"
            submitPendingLabel="Saving..."
            idPrefix={`snippet-edit-${snippet.id}`}
            onSuccess={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete snippet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this snippet? This action cannot be undone.
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
                  "Delete snippet"
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
