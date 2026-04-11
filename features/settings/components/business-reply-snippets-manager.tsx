"use client";

import { Button } from "@/components/ui/button";
import { ReplySnippetCard } from "@/features/inquiries/components/reply-snippet-card";
import { ReplySnippetForm } from "@/features/inquiries/components/reply-snippet-form";
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
  const snippetCountLabel =
    snippets.length === 1
      ? "1 saved reply ready."
      : `${snippets.length} saved replies ready.`;

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
      <div className="self-start xl:sticky xl:top-6">
        <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Reply library
            </p>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Saved follow-up replies
              </h2>
              <p className="text-sm text-muted-foreground">
                Reusable snippets for qualification replies and follow-up.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Total saved
              </p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {snippets.length}
              </p>
              <p className="text-sm text-muted-foreground">{snippetCountLabel}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-4 py-4">
            <p className="text-sm font-medium text-foreground">Best for common reply patterns.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use snippets for missing details, pricing questions, quote follow-up,
              and next steps.
            </p>
          </div>

          <Button asChild className="w-full">
            <a href="#reply-snippet-create-title">New snippet</a>
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Create saved reply
              </h2>
              <p className="text-sm text-muted-foreground">
                Short reusable text for inquiry replies and follow-up drafts.
              </p>
            </div>

            <ReplySnippetForm
              action={createAction}
              showSectionHeader={false}
              submitLabel="Save reply"
              submitPendingLabel="Saving reply..."
              idPrefix="reply-snippet-create"
            />
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Snippet library
                </h2>
                <p className="text-sm text-muted-foreground">
                  Edit or reuse any saved reply.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {snippets.length} {snippets.length === 1 ? "saved reply" : "saved replies"}
              </p>
            </div>

            {snippets.length ? (
              <div className="flex flex-col gap-4">
                {snippets.map((snippet) => (
                  <ReplySnippetCard
                    key={snippet.id}
                    snippet={snippet}
                    updateAction={updateAction.bind(null, snippet.id)}
                    deleteAction={deleteAction.bind(null, snippet.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-5 py-10 text-center">
                <p className="text-base font-semibold tracking-tight text-foreground">
                  No saved replies yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create one now to reuse it while qualifying leads and following up.
                </p>
                <Button asChild className="mt-5">
                  <a href="#reply-snippet-create-title">Create first snippet</a>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
