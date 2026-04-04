"use client";

import { MessageSquareText } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReplySnippetCard } from "@/features/inquiries/components/reply-snippet-card";
import { ReplySnippetForm } from "@/features/inquiries/components/reply-snippet-form";
import type {
  DashboardReplySnippet,
  ReplySnippetActionState,
  ReplySnippetDeleteActionState,
} from "@/features/inquiries/reply-snippet-types";

type WorkspaceReplySnippetsManagerProps = {
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

export function WorkspaceReplySnippetsManager({
  snippets,
  createAction,
  updateAction,
  deleteAction,
}: WorkspaceReplySnippetsManagerProps) {
  return (
    <div className="form-stack">
      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Saved reply snippets</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ReplySnippetForm
            action={createAction}
            submitLabel="Save reply snippet"
            submitPendingLabel="Saving snippet..."
            idPrefix="reply-snippet-create"
          />
        </CardContent>
      </Card>

      <Card className="gap-0 border-border/75 bg-card/97">
        <CardHeader className="gap-3 pb-5">
          <CardTitle>Snippet library</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
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
            <Alert>
              <MessageSquareText data-icon="inline-start" />
              <AlertTitle>No snippets yet</AlertTitle>
              <AlertDescription>
                Save the replies you reuse most so they are ready inside inquiry drafting.
              </AlertDescription>
            </Alert>
          )}

          {!snippets.length ? (
            <Button asChild variant="outline">
              <a href="#reply-snippet-create-title">Create first snippet</a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
