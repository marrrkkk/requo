"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { businessSlugMaxLength, businessSlugPattern } from "@/features/settings/utils";
import type { BusinessSettingsActionState } from "@/features/settings/types";
import { BusinessLogoField } from "./business-logo-field";
import { GeneralSettingsSection } from "./section";

type IdentitySectionProps = {
  businessNamePreview: string;
  draftValues: {
    name: string;
    slug: string;
    contactEmail: string;
    website: string;
  };
  fieldErrors: BusinessSettingsActionState["fieldErrors"];
  isPending: boolean;
  logoPreviewUrl: string | null;
  logoResetSignal: number;
  onPendingLogoChange: (hasPendingChange: boolean) => void;
  onRemoveLogoChange: (nextValue: boolean) => void;
  removeLogo: boolean;
  showRemoveToggle: boolean;
  updateDraftValue: <Key extends "name" | "slug" | "contactEmail" | "website">(
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
    <div className="flex flex-col gap-10">
      <GeneralSettingsSection title="Picture">
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
      </GeneralSettingsSection>

      <GeneralSettingsSection
        title="Name"
        description="Name of your business."
      >
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="settings-name">Name</FieldLabel>
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
      </GeneralSettingsSection>

      <GeneralSettingsSection
        title="Business website"
        description="Link customers to your site from quotes and your public page."
      >
        <Field data-invalid={Boolean(fieldErrors?.website) || undefined}>
          <FieldLabel htmlFor="settings-website">Website</FieldLabel>
          <FieldContent>
            <Input
              value={draftValues.website}
              autoComplete="url"
              disabled={isPending}
              id="settings-website"
              inputMode="url"
              maxLength={2000}
              name="website"
              onChange={(event) =>
                updateDraftValue("website", event.currentTarget.value)
              }
              placeholder="https://example.com"
              type="url"
            />
            <FieldError
              errors={
                fieldErrors?.website?.[0]
                  ? [{ message: fieldErrors.website[0] }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </GeneralSettingsSection>

      <GeneralSettingsSection
        title="Contact"
        description="Use the same reply address customers recognize."
      >
        <Field data-invalid={Boolean(fieldErrors?.contactEmail) || undefined}>
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
                updateDraftValue("contactEmail", event.currentTarget.value)
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
      </GeneralSettingsSection>

      <GeneralSettingsSection
        title="Public address"
        description="Customers use this address to reach your inquiry pages."
      >
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
            <FieldDescription>
              Your inquiry pages live at /inquire/
              {draftValues.slug.trim() || "your-slug"}.
            </FieldDescription>
            <FieldError
              errors={
                fieldErrors?.slug?.[0]
                  ? [{ message: fieldErrors.slug[0] }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </GeneralSettingsSection>
    </div>
  );
}
