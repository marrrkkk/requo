"use client";

import {
  FormSection,
} from "@/components/shared/form-layout";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  businessSlugMaxLength,
  businessSlugPattern,
} from "@/features/settings/utils";
import type { BusinessSettingsActionState } from "@/features/settings/types";
import { BusinessLogoField } from "./business-logo-field";

type IdentitySectionProps = {
  businessNamePreview: string;
  draftValues: {
    name: string;
    slug: string;
    contactEmail: string;
  };
  fieldErrors: BusinessSettingsActionState["fieldErrors"];
  isPending: boolean;
  logoPreviewUrl: string | null;
  logoResetSignal: number;
  onPendingLogoChange: (hasPendingChange: boolean) => void;
  onRemoveLogoChange: (nextValue: boolean) => void;
  removeLogo: boolean;
  showRemoveToggle: boolean;
  updateDraftValue: <Key extends "name" | "slug" | "contactEmail">(
    key: Key,
    value: string,
  ) => void;
};

export function IdentitySection({
  businessNamePreview,
  draftValues,
  fieldErrors,
  isPending,
  logoPreviewUrl,
  logoResetSignal,
  onPendingLogoChange,
  onRemoveLogoChange,
  removeLogo,
  showRemoveToggle,
  updateDraftValue,
}: IdentitySectionProps) {
  return (
    <FormSection
      description="Use the same name and reply address customers recognize."
      title="Identity & contact"
    >
      <FieldGroup>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <BusinessLogoField
            businessName={businessNamePreview}
            disabled={isPending}
            fieldError={fieldErrors?.logo?.[0]}
            initialPreviewUrl={logoPreviewUrl}
            onPendingChange={onPendingLogoChange}
            onRemoveLogoChange={onRemoveLogoChange}
            removeLogo={removeLogo}
            resetSignal={logoResetSignal}
            showRemoveToggle={showRemoveToggle}
          />

          <div className="grid min-w-0 flex-1 gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
              <FieldLabel htmlFor="settings-name">Business name</FieldLabel>
              <FieldContent>
                <Input
                  value={draftValues.name}
                  disabled={isPending}
                  id="settings-name"
                  maxLength={120}
                  minLength={2}
                  name="name"
                  onChange={(event) =>
                    updateDraftValue("name", event.currentTarget.value)
                  }
                  placeholder="Northline Print Studio"
                  required
                />
                <FieldError
                  errors={
                    fieldErrors?.name?.[0]
                      ? [{ message: fieldErrors.name[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field
              data-invalid={Boolean(fieldErrors?.contactEmail) || undefined}
            >
              <FieldLabel htmlFor="settings-contact-email">
                Contact email
              </FieldLabel>
              <FieldContent>
                <Input
                  value={draftValues.contactEmail}
                  disabled={isPending}
                  id="settings-contact-email"
                  maxLength={320}
                  name="contactEmail"
                  onChange={(event) =>
                    updateDraftValue(
                      "contactEmail",
                      event.currentTarget.value,
                    )
                  }
                  placeholder="hello@example.com"
                  type="email"
                />
                <FieldError
                  errors={
                    fieldErrors?.contactEmail?.[0]
                      ? [{ message: fieldErrors.contactEmail[0] }]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(fieldErrors?.slug) || undefined}>
            <FieldLabel htmlFor="settings-slug">Public slug</FieldLabel>
            <FieldContent>
              <Input
                value={draftValues.slug}
                disabled={isPending}
                id="settings-slug"
                maxLength={businessSlugMaxLength}
                minLength={2}
                name="slug"
                onChange={(event) =>
                  updateDraftValue("slug", event.currentTarget.value)
                }
                pattern={businessSlugPattern}
                placeholder="northline-print"
                required
                spellCheck={false}
              />
              <FieldError
                errors={
                  fieldErrors?.slug?.[0]
                    ? [{ message: fieldErrors.slug[0] }]
                    : undefined
                }
              />
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </FormSection>
  );
}
