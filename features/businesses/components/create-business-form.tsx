"use client";

import { useState } from "react";

import { CountryCombobox } from "@/components/shared/country-combobox";
import { FormActions, FormSection } from "@/components/shared/form-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getBusinessCountryOption } from "@/features/businesses/locale";
import {
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { WorkspaceListItem } from "@/features/workspaces/types";
import type { BusinessType } from "@/features/inquiries/business-types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

type CreateBusinessFormProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  workspaces: WorkspaceListItem[];
  isLocked?: boolean;
};

const initialState: CreateBusinessActionState = {};

export function CreateBusinessForm({
  action,
  workspaces,
  isLocked = false,
}: CreateBusinessFormProps) {
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    "general_project_services",
  );
  const [countryCode, setCountryCode] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || "");
  const nameError = state.fieldErrors?.name?.[0];
  const businessTypeError = state.fieldErrors?.businessType?.[0];
  const countryCodeError = state.fieldErrors?.countryCode?.[0];
  const workspaceIdError = state.fieldErrors?.workspaceId?.[0];
  const selectedCountry = getBusinessCountryOption(countryCode);

  return (
    <>
      <form
        action={formAction}
        className="form-stack"
        onSubmit={(e) => {
          if (isLocked) {
            e.preventDefault();
            setShowLockedDialog(true);
          }
        }}
      >
        <input name="businessType" type="hidden" value={businessType} />
        <input name="countryCode" type="hidden" value={countryCode} />
        <input name="workspaceId" type="hidden" value={workspaceId} />

        <FormSection title="New business">
        <FieldGroup>
          {workspaces.length > 1 ? (
             <Field data-invalid={Boolean(workspaceIdError) || undefined}>
              <FieldLabel htmlFor="business-workspace-id">Workspace</FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(workspaceIdError) || undefined}
                  disabled={isPending}
                  id="business-workspace-id"
                  onValueChange={(val) => setWorkspaceId(val)}
                  options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
                  placeholder="Choose workspace"
                  searchPlaceholder="Search workspace"
                  value={workspaceId}
                />
                <FieldError
                  errors={workspaceIdError ? [{ message: workspaceIdError }] : undefined}
                />
              </FieldContent>
            </Field>
          ) : null}

          <Field data-invalid={Boolean(nameError) || undefined}>
            <FieldLabel htmlFor="business-name">Business name</FieldLabel>
            <FieldContent>
              <Input
                id="business-name"
                name="name"
                maxLength={80}
                minLength={2}
                placeholder="Northside Signs"
                required
                aria-invalid={Boolean(nameError) || undefined}
                disabled={isPending}
              />
              <FieldError
                errors={nameError ? [{ message: nameError }] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(countryCodeError) || undefined}>
            <FieldLabel htmlFor="business-country-code">
              Country
            </FieldLabel>
            <FieldContent>
              <CountryCombobox
                aria-invalid={Boolean(countryCodeError) || undefined}
                disabled={isPending}
                id="business-country-code"
                onValueChange={setCountryCode}
                placeholder="Choose a country"
                searchPlaceholder="Search country"
                value={countryCode}
              />
              <FieldDescription>
                {selectedCountry
                  ? `Default currency: ${selectedCountry.currencyCode}`
                  : "We use this to set the starting quote currency."}
              </FieldDescription>
              <FieldError
                errors={
                  countryCodeError ? [{ message: countryCodeError }] : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(businessTypeError) || undefined}>
            <FieldLabel htmlFor="business-starter-template">
              Starter template
            </FieldLabel>
            <FieldContent>
              <Combobox
                aria-invalid={Boolean(businessTypeError) || undefined}
                disabled={isPending}
                id="business-starter-template"
                onValueChange={(value) => setBusinessType(value as BusinessType)}
                options={starterTemplateOptions}
                placeholder="Choose a starter template"
                renderOption={(option) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                )}
                searchPlaceholder="Search starter template"
                value={businessType}
              />
              <FieldError
                errors={
                  businessTypeError ? [{ message: businessTypeError }] : undefined
                }
              />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FormSection>

      <FormActions align="start">
        <Button disabled={isPending} type="submit">
          {isPending ? (
            <>
              <Spinner data-icon="inline-start" aria-hidden="true" />
              Creating business...
            </>
          ) : (
            "Create business"
          )}
        </Button>
      </FormActions>
    </form>

    <Dialog open={showLockedDialog} onOpenChange={setShowLockedDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Multiple businesses</DialogTitle>
          <DialogDescription>
            Managing completely separate brands, services, and billing requires upgrading your workspace plan. Wait for checkout to be added!
          </DialogDescription>
        </DialogHeader>
        <FormActions align="end">
          <Button variant="outline" onClick={() => setShowLockedDialog(false)}>
            Close
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
    </>
  );
}
