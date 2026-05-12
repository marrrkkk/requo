"use client";

import { useEffect, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Star } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  const [, duplicateFormAction, isDuplicatePending] =
    useActionStateWithSonner(duplicateAction, initialState);
  const [defaultState, defaultFormAction, isDefaultPending] = useActionStateWithSonner(
    setDefaultAction,
    initialState,
  );
  const [publicState, publicFormAction, isPublicPending] = useActionStateWithSonner(
    togglePublicAction,
    initialState,
  );
  const isDefaultAndPublic = isDefault && isPublicInquiryEnabled;

  useEffect(() => {
    if (!defaultState.success && !publicState.success) {
      return;
    }

    router.refresh();
  }, [defaultState.success, publicState.success, router]);

  return (
    <Card className="gap-0 border-border/75 bg-card/97">
      <CardHeader className="gap-1.5 pb-5">
        <CardTitle>Status</CardTitle>
        <CardDescription>
          Visibility and defaults for this form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <StatusRow
          label="Public page"
          status={
            <Badge variant={isPublicInquiryEnabled ? "secondary" : "outline"}>
              {isPublicInquiryEnabled ? "Live" : "Draft"}
            </Badge>
          }
          action={
            isDefaultAndPublic ? (
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
                <Button
                  className="w-full"
                  disabled={isPublicPending}
                  size="sm"
                  type="submit"
                  variant="outline"
                >
                  {isPublicPending ? (
                    <>
                      <Spinner data-icon="inline-start" aria-hidden="true" />
                      Saving...
                    </>
                  ) : isPublicInquiryEnabled ? (
                    <>
                      <EyeOff data-icon="inline-start" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye data-icon="inline-start" />
                      Publish
                    </>
                  )}
                </Button>
              </form>
            )
          }
        />

        <StatusRow
          label="Default form"
          status={
            <Badge variant={isDefault ? "secondary" : "outline"}>
              {isDefault ? "Default" : "Not default"}
            </Badge>
          }
          action={
            isDefault ? null : (
              <form action={defaultFormAction}>
                <input name="targetFormId" type="hidden" value={formId} />
                <Button
                  className="w-full"
                  disabled={isDefaultPending}
                  size="sm"
                  type="submit"
                  variant="outline"
                >
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
            )
          }
        />

        <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
          <form action={duplicateFormAction}>
            <input name="targetFormId" type="hidden" value={formId} />
            <Button
              className="w-full"
              disabled={isDuplicatePending}
              size="sm"
              type="submit"
              variant="outline"
            >
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
          <p className="text-xs leading-5 text-muted-foreground">
            Creates a copy with the same fields and public page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  action,
  label,
  status,
}: {
  action: ReactNode;
  label: string;
  status: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {status}
      </div>
      {action ? <div className="sm:shrink-0">{action}</div> : null}
    </div>
  );
}
