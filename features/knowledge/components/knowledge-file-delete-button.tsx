"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { KnowledgeFileDeleteActionState } from "@/features/knowledge/types";

type KnowledgeFileDeleteButtonProps = {
  action: (
    state: KnowledgeFileDeleteActionState,
    formData: FormData,
  ) => Promise<KnowledgeFileDeleteActionState>;
};

const initialState: KnowledgeFileDeleteActionState = {};

export function KnowledgeFileDeleteButton({
  action,
}: KnowledgeFileDeleteButtonProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not delete the file.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button disabled={isPending} type="submit" variant="outline">
        <Trash2 data-icon="inline-start" />
        {isPending ? (
          <>
            <Spinner data-icon="inline-start" aria-hidden="true" />
            Deleting...
          </>
        ) : (
          "Delete"
        )}
      </Button>
    </form>
  );
}
