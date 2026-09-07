"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { publicSlugMaxLength, publicSlugPattern } from "@/lib/slugs";

import { DetailsPanel } from "./shared";

export type BasicsSectionProps = {
  formName: string;
  formSlug: string;
  isPending: boolean;
  nameError: string | undefined;
  slugError: string | undefined;
  settingsSlug: string;
  onFormNameChange: (value: string) => void;
  onFormSlugChange: (value: string) => void;
};

export function BasicsSection({
  formName,
  formSlug,
  isPending,
  nameError,
  slugError,
  settingsSlug,
  onFormNameChange,
  onFormSlugChange,
}: BasicsSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <DetailsPanel
        description="Shown to customers and used to build the public URL."
        eyebrow="Identity"
        title="Service details"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Field data-invalid={Boolean(nameError) || undefined}>
            <FieldLabel htmlFor="inquiry-page-form-name">
              Service name
            </FieldLabel>
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
              <FieldLabel htmlFor="inquiry-page-form-slug">Slug</FieldLabel>
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
    </div>
  );
}