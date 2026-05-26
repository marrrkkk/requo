"use client";

import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  getStarterTemplateDefinition,
  getStarterTemplateBusinessType,
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";
import { publicSlugMaxLength, publicSlugPattern } from "@/lib/slugs";

import { DetailsPanel, SectionHeading } from "./shared";

export type BasicsSectionProps = {
  formName: string;
  formSlug: string;
  businessType: BusinessType;
  isPending: boolean;
  nameError: string | undefined;
  slugError: string | undefined;
  businessTypeError: string | undefined;
  settingsSlug: string;
  onFormNameChange: (value: string) => void;
  onFormSlugChange: (value: string) => void;
  onBusinessTypeChange: (value: BusinessType) => void;
};

export function BasicsSection({
  formName,
  formSlug,
  businessType,
  isPending,
  nameError,
  slugError,
  businessTypeError,
  settingsSlug,
  onFormNameChange,
  onFormSlugChange,
  onBusinessTypeChange,
}: BasicsSectionProps) {
  const starterTemplate = getStarterTemplateDefinition(businessType);

  return (
    <section
      className="section-panel scroll-mt-20 p-5 sm:p-6"
      id="basics"
    >
      <SectionHeading
        description="Name, link, and starter template for this form."
        title="Basics"
      />

      <div className="mt-6 flex flex-col gap-6">
        <DetailsPanel
          description="Shown to customers and used to build the public URL."
          eyebrow="Identity"
          title="Form details"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Field data-invalid={Boolean(nameError) || undefined}>
              <FieldLabel htmlFor="inquiry-page-form-name">Form name</FieldLabel>
              <FieldContent>
                <Input
                  aria-invalid={Boolean(nameError) || undefined}
                  disabled={isPending}
                  id="inquiry-page-form-name"
                  maxLength={80}
                  minLength={2}
                  name="name"
                  onChange={(event) => onFormNameChange(event.currentTarget.value)}
                  required
                  value={formName}
                />
                <FieldError
                  errors={nameError ? [{ message: nameError }] : undefined}
                />
              </FieldContent>
            </Field>

              <Field data-invalid={Boolean(slugError) || undefined}>
                <FieldLabel htmlFor="inquiry-page-form-slug">Form slug</FieldLabel>
                <FieldContent>
                  <Input
                    aria-invalid={Boolean(slugError) || undefined}
                    disabled={isPending}
                    id="inquiry-page-form-slug"
                    maxLength={publicSlugMaxLength}
                    minLength={2}
                    name="slug"
                    onChange={(event) => onFormSlugChange(event.currentTarget.value)}
                    pattern={publicSlugPattern}
                    required
                    spellCheck={false}
                    value={formSlug}
                  />
                  <FieldDescription>
                    `/inquire/{settingsSlug}/{formSlug || "form-slug"}`
                  </FieldDescription>
                  <FieldError
                    errors={slugError ? [{ message: slugError }] : undefined}
                  />
                </FieldContent>
              </Field>
            </div>
          </DetailsPanel>

          <DetailsPanel
            description="Pick the best starting point."
            eyebrow="Template"
            title="Starter template"
          >
            <Field data-invalid={Boolean(businessTypeError) || undefined}>
              <FieldLabel htmlFor="inquiry-page-business-type">
                Starter template
              </FieldLabel>
              <FieldContent>
                <Combobox
                  aria-invalid={Boolean(businessTypeError) || undefined}
                  disabled={isPending}
                  id="inquiry-page-business-type"
                  onValueChange={(value) =>
                    onBusinessTypeChange(value as BusinessType)
                  }
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
                  value={getStarterTemplateBusinessType(businessType)}
                />
                <FieldDescription>
                  {starterTemplate.helperText}
                </FieldDescription>
                <FieldError
                  errors={
                    businessTypeError
                      ? [{ message: businessTypeError }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </DetailsPanel>

        </div>
    </section>
  );
}
