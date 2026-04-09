"use client";

import { useActionState, useState } from "react";

import { CountryCombobox } from "@/components/shared/country-combobox";
import { FormActions, FormSection } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  businessTypeMeta,
  businessTypeOptions,
  type BusinessType,
} from "@/features/inquiries/business-types";
import { getBusinessCountryOption } from "@/features/businesses/locale";
import type { CreateBusinessActionState } from "@/features/businesses/types";

type CreateBusinessFormProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
};

const initialState: CreateBusinessActionState = {};

export function CreateBusinessForm({
  action,
}: CreateBusinessFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [businessType, setBusinessType] = useState<BusinessType>(
    "general_project_services",
  );
  const [countryCode, setCountryCode] = useState("");
  const nameError = state.fieldErrors?.name?.[0];
  const businessTypeError = state.fieldErrors?.businessType?.[0];
  const countryCodeError = state.fieldErrors?.countryCode?.[0];
  const selectedCountry = getBusinessCountryOption(countryCode);

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not create the business.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <input name="businessType" type="hidden" value={businessType} />
      <input name="countryCode" type="hidden" value={countryCode} />

      <FormSection title="New business">
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
            <FieldLabel htmlFor="business-type">
              Business type
            </FieldLabel>
            <FieldContent>
              <Combobox
                aria-invalid={Boolean(businessTypeError) || undefined}
                disabled={isPending}
                id="business-type"
                onValueChange={(value) => setBusinessType(value as BusinessType)}
                options={businessTypeOptions}
                placeholder="Choose a business type"
                renderOption={(option) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                )}
                searchPlaceholder="Search business type"
                value={businessType}
              />
              <p className="text-sm text-muted-foreground">
                {businessTypeMeta[businessType].description}
              </p>
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
  );
}
