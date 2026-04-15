"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import type { BusinessMemberInviteAcceptActionState } from "@/features/business-members/types";

type BusinessMemberInviteAcceptFormProps = {
  acceptAction: (
    state: BusinessMemberInviteAcceptActionState,
    formData: FormData,
  ) => Promise<BusinessMemberInviteAcceptActionState>;
  declineAction?: (
    state: BusinessMemberInviteAcceptActionState,
    formData: FormData,
  ) => Promise<BusinessMemberInviteAcceptActionState>;
  submitLabel: string;
};

const initialState: BusinessMemberInviteAcceptActionState = {};

export function BusinessMemberInviteAcceptForm({
  acceptAction,
  declineAction,
  submitLabel,
}: BusinessMemberInviteAcceptFormProps) {
  const [, acceptFormAction, isAcceptPending] = useActionStateWithSonner(
    acceptAction,
    initialState,
  );
  
  const [, declineFormAction, isDeclinePending] = useActionStateWithSonner(
    declineAction || (async () => initialState),
    initialState,
  );

  const isPending = isAcceptPending || isDeclinePending;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={acceptFormAction}>
        <Button disabled={isPending} size="lg" type="submit">
          {isAcceptPending ? (
            <>
              <Spinner aria-hidden="true" data-icon="inline-start" />
              Joining...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
      
      {declineAction && (
        <form action={declineFormAction}>
          <Button disabled={isPending} size="lg" type="submit" variant="outline">
            {isDeclinePending ? (
              <>
                <Spinner aria-hidden="true" data-icon="inline-start" />
                Declining...
              </>
            ) : (
              "Decline"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
