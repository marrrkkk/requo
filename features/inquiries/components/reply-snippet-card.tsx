"use client";

import { useState } from "react";
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
import { ReplySnippetDeleteButton } from "@/features/inquiries/components/reply-snippet-delete-button";
import { ReplySnippetForm } from "@/features/inquiries/components/reply-snippet-form";
import type {
  ReplySnippetActionState,
  ReplySnippetDeleteActionState,
  DashboardReplySnippet,
} from "@/features/inquiries/reply-snippet-types";
import { formatInquiryDateTime } from "@/features/inquiries/utils";

type ReplySnippetCardProps = {
  snippet: DashboardReplySnippet;
  updateAction: (
    state: ReplySnippetActionState,
    formData: FormData,
  ) => Promise<ReplySnippetActionState>;
  deleteAction: (
    state: ReplySnippetDeleteActionState,
    formData: FormData,
  ) => Promise<ReplySnippetDeleteActionState>;
};

export function ReplySnippetCard({
  snippet,
  updateAction,
  deleteAction,
}: ReplySnippetCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className="gap-0 border-border/75 bg-card/97">
      <CardHeader className="gap-3 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="text-xl">{snippet.title}</CardTitle>
            <CardDescription>
              Updated {formatInquiryDateTime(snippet.updatedAt)}
            </CardDescription>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEditing((current) => !current)}
          >
            <PencilLine data-icon="inline-start" />
            {isEditing ? "Close editor" : "Edit snippet"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-0">
        <div className="soft-panel p-4 shadow-none">
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
            {snippet.body}
          </p>
        </div>

        {isEditing ? (
          <ReplySnippetForm
            action={updateAction}
            initialValues={{
              title: snippet.title,
              body: snippet.body,
            }}
            submitLabel="Save snippet"
            submitPendingLabel="Saving snippet..."
            onSuccess={() => setIsEditing(false)}
            idPrefix={`reply-snippet-${snippet.id}`}
          />
        ) : null}
      </CardContent>

      <CardFooter className="justify-end">
        <ReplySnippetDeleteButton action={deleteAction} />
      </CardFooter>
    </Card>
  );
}
