"use client";

import { useMemo } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  getStarterTemplateDefinition,
  starterTemplateOptions,
} from "@/features/businesses/starter-templates";
import type { BusinessType } from "@/features/inquiries/business-types";

type StarterTemplateComboboxOption = ComboboxOption & {
  description: string;
  recommendedFields: readonly string[];
};

type StarterTemplateComboboxProps = {
  autoFocus?: boolean;
  buttonClassName?: string;
  disabled?: boolean;
  id: string;
  onValueChange: (value: BusinessType) => void;
  placeholder?: string;
  value: BusinessType | "";
  "aria-invalid"?: boolean;
};

export function StarterTemplateCombobox({
  autoFocus = false,
  buttonClassName,
  disabled = false,
  id,
  onValueChange,
  placeholder = "Choose a business type",
  value,
  "aria-invalid": ariaInvalid,
}: StarterTemplateComboboxProps) {
  const options = useMemo<StarterTemplateComboboxOption[]>(
    () =>
      starterTemplateOptions.map((option) => {
        const template = getStarterTemplateDefinition(option.value);

        return {
          description: option.description,
          label: option.label,
          recommendedFields: template.recommendedFields,
          searchText: option.searchText,
          value: option.value,
        };
      }),
    [],
  );

  const selectedTemplate = useMemo(
    () =>
      value
        ? {
            ...getStarterTemplateDefinition(value),
            option: starterTemplateOptions.find((o) => o.value === value),
          }
        : null,
    [value],
  );

  return (
    <Combobox
      aria-invalid={ariaInvalid}
      autoFocus={autoFocus}
      buttonClassName={buttonClassName}
      disabled={disabled}
      emptyMessage="No templates found."
      groupHeading="Templates"
      id={id}
      onValueChange={(v) => onValueChange(v as BusinessType)}
      options={options}
      placeholder={placeholder}
      renderOption={(option) => (
        <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
          <p className="truncate font-medium">{option.label}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {option.description}
          </p>
        </div>
      )}
      renderValue={() =>
        selectedTemplate?.option ? (
          <span className="truncate text-left">
            {selectedTemplate.option.label}
          </span>
        ) : null
      }
      searchable
      searchPlaceholder="Search templates"
      value={value}
    />
  );
}
