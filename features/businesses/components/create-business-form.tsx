"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
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
import {
  businessCurrencyOptions,
  getBusinessCurrencyOption,
} from "@/features/businesses/locale";
import {
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { BusinessType } from "@/features/inquiries/business-types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";

type CreateBusinessFormProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  workspaceId: string;
};

const initialState: CreateBusinessActionState = {};

export function CreateBusinessForm({
  action,
  workspaceId,
}: CreateBusinessFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    "general_project_services",
  );
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const nameError = state.fieldErrors?.name?.[0];
  const businessTypeError = state.fieldErrors?.businessType?.[0];
  const defaultCurrencyError = state.fieldErrors?.defaultCurrency?.[0];
  const selectedCurrency = getBusinessCurrencyOption(defaultCurrency);

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
    >
        <input name="businessType" type="hidden" value={businessType} />
        <input name="defaultCurrency" type="hidden" value={defaultCurrency} />
        <input name="workspaceId" type="hidden" value={workspaceId} />

        <DialogBody className="overflow-y-auto">
          <FieldGroup>

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

            <Field data-invalid={Boolean(defaultCurrencyError) || undefined}>
              <FieldLabel htmlFor="business-default-currency">
                Currency
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(defaultCurrencyError) || undefined}
                  disabled={isPending}
                  id="business-default-currency"
                  onValueChange={setDefaultCurrency}
                  options={businessCurrencyOptions.map((opt) => ({
                    value: opt.code,
                    label: opt.label,
                    searchText: `${opt.code} ${opt.name}`,
                  }))}
                  placeholder="Choose a currency"
                  searchPlaceholder="Search currency"
                  searchable
                  value={defaultCurrency}
                />
                <FieldDescription>
                  New quotes and pricing entries start with{" "}
                  {selectedCurrency?.code ?? defaultCurrency}.
                </FieldDescription>
                <FieldError
                  errors={
                    defaultCurrencyError ? [{ message: defaultCurrencyError }] : undefined
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
        </DialogBody>

        <DialogFooter>
          <Button disabled={isPending} type="submit">
            {isPending ? (
              <>
                <Spinner data-icon="inline-start" aria-hidden="true" />
                Creating...
              </>
            ) : (
              "Create business"
            )}
          </Button>
        </DialogFooter>
      </form>
  );
}
