"use client";

import { useActionState, useState } from "react";

import { FormActions, FormSection } from "@/components/shared/form-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  businessTypeMeta,
  businessTypes,
  type BusinessType,
} from "@/features/inquiries/business-types";
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
    "general_services",
  );
  const nameError = state.fieldErrors?.name?.[0];
  const businessTypeError = state.fieldErrors?.businessType?.[0];

  return (
    <form action={formAction} className="form-stack">
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not create the business.</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <input name="businessType" type="hidden" value={businessType} />

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

          <Field data-invalid={Boolean(businessTypeError) || undefined}>
            <FieldLabel htmlFor="business-type">
              Business type
            </FieldLabel>
            <FieldContent>
              <Select onValueChange={(value) => setBusinessType(value as BusinessType)} value={businessType}>
                <SelectTrigger className="w-full" id="business-type">
                  <SelectValue placeholder="Choose a business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {businessTypes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {businessTypeMeta[option].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
