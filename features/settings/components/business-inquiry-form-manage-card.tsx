"use client";

import { useEffect, type ReactNode } from "react";
import { Copy, Eye, EyeOff, Info, Star } from "lucide-react";

import { useProgressRouter } from "@/hooks/use-progress-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import {
  Card,
  CardContent,
  CardDescription,
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
    <Card size="sm" className="gap-0 border-border/75 bg-card/97">
      <CardHeader className="gap-1 border-b border-border/70 pb-3">
        <CardTitle>Status</CardTitle>
        <CardDescription className="text-xs leading-5">
          Visibility and defaults for this form.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border/70 p-0">
        <SettingsRow
          label="Public page"
          status={
            <Badge variant={isPublicInquiryEnabled ? "secondary" : "outline"}>
              {isPublicInquiryEnabled ? "Live" : "Draft"}
            </Badge>
          }
          action={
            isDefaultAndPublic ? (
              <p className="flex max-w-[14rem] items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                <Info
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                />
                <span>
                  Default form stays live. Set another default before unpublishing.
                </span>
              </p>
            ) : (
              <form action={publicFormAction}>
                <input name="targetFormId" type="hidden" value={formId} />
                <input
                  name="publicInquiryEnabled"
                  type="hidden"
                  value={String(!isPublicInquiryEnabled)}
                />
                <Button
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

        <SettingsRow
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
                      Set default
                    </>
                  )}
                </Button>
              </form>
            )
          }
        />

        <SettingsRow
          hint="Same fields and public page."
          label="Duplicate"
          action={
            <form action={duplicateFormAction}>
              <input name="targetFormId" type="hidden" value={formId} />
              <Button
                disabled={isDuplicatePending}
                size="sm"
                type="submit"
                variant="outline"
              >
                {isDuplicatePending ? (
                  <>
                    <Spinner data-icon="inline-start" aria-hidden="true" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy data-icon="inline-start" />
                    Duplicate
                  </>
                )}
              </Button>
            </form>
          }
        />
      </CardContent>
    </Card>
  );
}

function SettingsRow({
  action,
  hint,
  label,
  status,
}: {
  action: ReactNode;
  hint?: string;
  label: string;
  status?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {status}
        </div>
        {hint ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
