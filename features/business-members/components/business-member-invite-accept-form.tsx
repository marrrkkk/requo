"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import type { BusinessMemberInviteAcceptActionState } from "@/features/business-members/types";

type BusinessMemberInviteAcceptFormProps = {
  action: (
    state: BusinessMemberInviteAcceptActionState,
    formData: FormData,
  ) => Promise<BusinessMemberInviteAcceptActionState>;
  submitLabel: string;
};

const initialState: BusinessMemberInviteAcceptActionState = {};

export function BusinessMemberInviteAcceptForm({
  action,
  submitLabel,
}: BusinessMemberInviteAcceptFormProps) {
  const [, formAction, isPending] = useActionStateWithSonner(action, initialState);

  return (
    <form action={formAction}>
      <Button disabled={isPending} size="lg" type="submit">
        {isPending ? (
          <>
            <Spinner aria-hidden="true" data-icon="inline-start" />
            Joining...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
