"use client";

import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BusinessDeleteActionState } from "@/features/settings/types";

type BusinessDeleteZoneProps = {
  action: (
    state: BusinessDeleteActionState,
    formData: FormData,
  ) => Promise<BusinessDeleteActionState>;
  businessName: string;
};

const initialState: BusinessDeleteActionState = {};

export function BusinessDeleteZone({
  action,
  businessName,
}: BusinessDeleteZoneProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );

  return (
    <Card className="gap-0 border-border/75 bg-card/97">
      <CardHeader className="gap-2.5 pb-5">
        <CardTitle>Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        <Alert variant="destructive">
          <AlertTriangle data-icon="inline-start" />
          <AlertTitle>Delete business</AlertTitle>
          <AlertDescription>
            This permanently deletes the business, its inquiries, quotes, pricing,
            files, and settings. This cannot be undone.
          </AlertDescription>
        </Alert>

        <form action={formAction} className="form-stack">
          <Field
            data-invalid={Boolean(state.fieldErrors?.confirmation) || undefined}
          >
            <FieldLabel htmlFor="business-delete-confirmation">
              Type <span className="font-semibold text-foreground">{businessName}</span> to confirm
            </FieldLabel>
            <FieldContent>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.confirmation) || undefined}
                autoComplete="off"
                disabled={isPending}
                id="business-delete-confirmation"
                maxLength={120}
                name="confirmation"
                required
                spellCheck={false}
              />
              <FieldError
                errors={
                  state.fieldErrors?.confirmation?.[0]
                    ? [{ message: state.fieldErrors.confirmation[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>

          <div className="dashboard-actions">
            <Button disabled={isPending} type="submit" variant="destructive">
              <Trash2 data-icon="inline-start" />
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Deleting...
                </>
              ) : (
                "Delete business"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
