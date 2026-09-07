"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogFooter,
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
  getDefaultOnboardingServiceName,
  resolveFirstServiceNameOnTypeChange,
} from "@/features/onboarding/helpers";
import {
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import { validateBusinessSlug } from "@/features/businesses/validation";
import type { CreateBusinessActionState } from "@/features/businesses/types";
import type { BusinessType } from "@/features/inquiries/business-types";
import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import type { BusinessPlan } from "@/lib/plans/plans";
import { slugifyPublicName } from "@/lib/slugs";

import { ServiceNameFields, type ServiceNameEntry } from "./service-name-fields";

type CreateBusinessFormProps = {
  action: (
    state: CreateBusinessActionState,
    formData: FormData,
  ) => Promise<CreateBusinessActionState>;
  businessId: string;
  /** When true, renders without dialog wrappers for standalone page use. */
  standalone?: boolean;
  /** Resolved plan for the new business; drives the service cap UI. */
  plan?: BusinessPlan;
};

const initialState: CreateBusinessActionState = {};

export function CreateBusinessForm({
  action,
  businessId,
  standalone = false,
  plan = "free",
}: CreateBusinessFormProps) {
  const [state, formAction, isPending] = useActionStateWithSonner(
    action,
    initialState,
  );
  const [businessType, setBusinessType] = useState<BusinessType>(
    "general_project_services",
  );
  const [services, setServices] = useState<ServiceNameEntry[]>([
    { name: "" },
  ]);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [slugPreview, setSlugPreview] = useState<string>("");
  const [slugError, setSlugError] = useState<string | undefined>(undefined);
  const nameError = state.fieldErrors?.name?.[0];
  const businessTypeError = state.fieldErrors?.businessType?.[0];
  const defaultCurrencyError = state.fieldErrors?.defaultCurrency?.[0];
  const selectedCurrency = getBusinessCurrencyOption(defaultCurrency);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      if (!name.trim()) {
        setSlugPreview("");
        setSlugError(undefined);
        return;
      }
      const generated = slugifyPublicName(name, { fallback: "business" });
      setSlugPreview(generated);
      const validation = validateBusinessSlug(generated);
      setSlugError(validation.valid ? undefined : validation.error);
    },
    [],
  );

  const handleNameBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const name = e.target.value;
      if (!name.trim()) {
        setSlugPreview("");
        setSlugError(undefined);
        return;
      }
      const generated = slugifyPublicName(name, { fallback: "business" });
      setSlugPreview(generated);
      const validation = validateBusinessSlug(generated);
      setSlugError(validation.valid ? undefined : validation.error);
    },
    [],
  );

  function handleBusinessTypeChange(value: string) {
    const nextBusinessType = value as BusinessType;

    setServices((currentServices) =>
      resolveFirstServiceNameOnTypeChange({
        services: currentServices,
        previousBusinessType: businessType,
        nextBusinessType,
      }),
    );
    setBusinessType(nextBusinessType);
  }

  const fields = (
    <FieldGroup>
      <Field data-invalid={Boolean(nameError || slugError) || undefined}>
        <FieldLabel htmlFor="business-name">Business name</FieldLabel>
        <FieldContent>
          <Input
            id="business-name"
            name="name"
            maxLength={80}
            minLength={2}
            placeholder="Northside Signs"
            required
            aria-invalid={Boolean(nameError || slugError) || undefined}
            disabled={isPending}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
          />
          {slugPreview && !slugError && (
            <FieldDescription>
              URL slug: <span className="font-mono text-xs">{slugPreview}</span>
            </FieldDescription>
          )}
          <FieldError
            errors={
              nameError
                ? [{ message: nameError }]
                : slugError
                  ? [{ message: slugError }]
                  : undefined
            }
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
          Business type
        </FieldLabel>
        <FieldContent>
          <Combobox
            aria-invalid={Boolean(businessTypeError) || undefined}
            disabled={isPending}
            id="business-starter-template"
            onValueChange={handleBusinessTypeChange}
            options={starterTemplateOptions}
            placeholder="Choose a business type"
            renderOption={(option) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            )}
            searchPlaceholder="Search business types"
            value={businessType}
          />
          <FieldError
            errors={
              businessTypeError ? [{ message: businessTypeError }] : undefined
            }
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Services</FieldLabel>
        <FieldContent>
          <ServiceNameFields
            extraPlaceholder="e.g. Sign installation"
            firstPlaceholder={getDefaultOnboardingServiceName(businessType)}
            isPending={isPending}
            onAddService={() =>
              setServices((current) => [...current, { name: "" }])
            }
            onNameChange={(index, name) =>
              setServices((current) =>
                current.map((service, serviceIndex) =>
                  serviceIndex === index ? { name } : service,
                ),
              )
            }
            onRemoveService={(index) =>
              setServices((current) =>
                current.length > 1
                  ? current.filter((_, serviceIndex) => serviceIndex !== index)
                  : current,
              )
            }
            plan={plan}
            services={services}
          />
        </FieldContent>
      </Field>
    </FieldGroup>
  );

  const submitButton = (
    <Button disabled={isPending || Boolean(slugError)} type="submit">
      {isPending ? (
        <>
          <Spinner data-icon="inline-start" aria-hidden="true" />
          Creating...
        </>
      ) : (
        "Create business"
      )}
    </Button>
  );

  if (standalone) {
    return (
      <form
        action={formAction}
        className="flex min-h-0 flex-1 flex-col gap-6"
      >
        <input name="businessType" type="hidden" value={businessType} />
        <input name="defaultCurrency" type="hidden" value={defaultCurrency} />
        <input name="businessId" type="hidden" value={businessId} />
        <input
          name="services"
          type="hidden"
          value={JSON.stringify(services)}
        />

        {fields}

        <div className="flex items-center justify-end pt-2">
          {submitButton}
        </div>
      </form>
    );
  }

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
    >
        <input name="businessType" type="hidden" value={businessType} />
        <input name="defaultCurrency" type="hidden" value={defaultCurrency} />
        <input name="businessId" type="hidden" value={businessId} />
        <input
          name="services"
          type="hidden"
          value={JSON.stringify(services)}
        />

        <DialogBody className="overflow-y-auto">
          {fields}
        </DialogBody>

        <DialogFooter>
          {submitButton}
        </DialogFooter>
      </form>
  );
}
