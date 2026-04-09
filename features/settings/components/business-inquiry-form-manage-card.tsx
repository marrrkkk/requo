"use client";

import { useActionState, useEffect } from "react";
import { Copy, Eye, EyeOff, Star } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessInquiryFormsActionState } from "@/features/settings/types";

type BusinessInquiryFormManageCardProps = {
  duplicateAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
  formId: string;
  isDefault: boolean;
  setDefaultAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
  isPublicInquiryEnabled: boolean;
  togglePublicAction: (
    state: BusinessInquiryFormsActionState,
    formData: FormData,
  ) => Promise<BusinessInquiryFormsActionState>;
};

const initialState: BusinessInquiryFormsActionState = {};

export function BusinessInquiryFormManageCard({
  duplicateAction,
  formId,
  isDefault,
  setDefaultAction,
  isPublicInquiryEnabled,
  togglePublicAction,
}: BusinessInquiryFormManageCardProps) {
  const router = useProgressRouter();
  const [duplicateState, duplicateFormAction, isDuplicatePending] =
    useActionState(duplicateAction, initialState);
  const [defaultState, defaultFormAction, isDefaultPending] = useActionState(
    setDefaultAction,
    initialState,
  );
  const [publicState, publicFormAction, isPublicPending] = useActionState(
    togglePublicAction,
    initialState,
  );

  useEffect(() => {
    if (!defaultState.success && !publicState.success) {
      return;
    }

    router.refresh();
  }, [defaultState.success, publicState.success, router]);

  return (
    <Card className="gap-0 border-border/75 bg-card/97">
      <CardHeader className="gap-3 pb-5">
        <CardTitle>Manage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {duplicateState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not duplicate the form.</AlertTitle>
            <AlertDescription>{duplicateState.error}</AlertDescription>
          </Alert>
        ) : null}

        {defaultState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not update the default form.</AlertTitle>
            <AlertDescription>{defaultState.error}</AlertDescription>
          </Alert>
        ) : null}
        {publicState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not update public availability.</AlertTitle>
            <AlertDescription>{publicState.error}</AlertDescription>
          </Alert>
        ) : null}

        <form action={duplicateFormAction}>
          <input name="targetFormId" type="hidden" value={formId} />
          <Button className="w-full" disabled={isDuplicatePending} type="submit" variant="outline">
            {isDuplicatePending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy data-icon="inline-start" />
                Duplicate form
              </>
            )}
          </Button>
        </form>

        {!isDefault ? (
          <form action={defaultFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <Button className="w-full" disabled={isDefaultPending} type="submit">
              {isDefaultPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Star data-icon="inline-start" />
                  Set as default
                </>
              )}
            </Button>
          </form>
        ) : null}

        {isDefault && isPublicInquiryEnabled ? (
          <Alert>
            <AlertTitle>Default form stays published</AlertTitle>
            <AlertDescription>
              Set another form as default before unpublishing this one.
            </AlertDescription>
          </Alert>
        ) : (
          <form action={publicFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <input
              name="publicInquiryEnabled"
              type="hidden"
              value={String(!isPublicInquiryEnabled)}
            />
            <Button className="w-full" disabled={isPublicPending} type="submit" variant="outline">
              {isPublicPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  {isPublicInquiryEnabled ? (
                    <EyeOff data-icon="inline-start" />
                  ) : (
                    <Eye data-icon="inline-start" />
                  )}
                  {isPublicInquiryEnabled ? "Unpublish form" : "Publish form"}
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
