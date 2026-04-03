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
import { KnowledgeFaqDeleteButton } from "@/features/knowledge/components/knowledge-faq-delete-button";
import { KnowledgeFaqForm } from "@/features/knowledge/components/knowledge-faq-form";
import type {
  DashboardKnowledgeFaq,
  KnowledgeFaqActionState,
  KnowledgeFaqDeleteActionState,
} from "@/features/knowledge/types";
import { formatKnowledgeDateTime } from "@/features/knowledge/utils";

type KnowledgeFaqCardProps = {
  faq: DashboardKnowledgeFaq;
  updateAction: (
    state: KnowledgeFaqActionState,
    formData: FormData,
  ) => Promise<KnowledgeFaqActionState>;
  deleteAction: (
    state: KnowledgeFaqDeleteActionState,
    formData: FormData,
  ) => Promise<KnowledgeFaqDeleteActionState>;
};

export function KnowledgeFaqCard({
  faq,
  updateAction,
  deleteAction,
}: KnowledgeFaqCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex flex-col gap-1">
            <CardTitle className="text-xl">{faq.question}</CardTitle>
            <CardDescription>
              Updated {formatKnowledgeDateTime(faq.updatedAt)}
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing((current) => !current)}
          >
            <PencilLine data-icon="inline-start" />
            {isEditing ? "Close editor" : "Edit FAQ"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
            {faq.answer}
          </p>
        </div>

        {isEditing ? (
          <KnowledgeFaqForm
            action={updateAction}
            initialValues={{
              question: faq.question,
              answer: faq.answer,
            }}
            submitLabel="Save FAQ"
            submitPendingLabel="Saving FAQ..."
            onSuccess={() => setIsEditing(false)}
            idPrefix={`knowledge-faq-${faq.id}`}
          />
        ) : null}
      </CardContent>

      <CardFooter className="justify-end">
        <KnowledgeFaqDeleteButton action={deleteAction} />
      </CardFooter>
    </Card>
  );
}
