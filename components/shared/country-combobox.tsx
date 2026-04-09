"use client";

import { useMemo } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  businessCountryOptions,
  getBusinessCountryOption,
} from "@/features/businesses/locale";
import { cn } from "@/lib/utils";

type CountryComboboxProps = {
  autoFocus?: boolean;
  buttonClassName?: string;
  disabled?: boolean;
  id: string;
  onValueChange: (countryCode: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  showFlags?: boolean;
  value: string;
  "aria-invalid"?: boolean;
};

type CountryComboboxOption = ComboboxOption & {
  countryCode: string;
  currencyCode: string;
  flag: string;
};

export function CountryCombobox({
  autoFocus = false,
  buttonClassName,
  disabled = false,
  id,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search country",
  showFlags = true,
  value,
  "aria-invalid": ariaInvalid,
}: CountryComboboxProps) {
  const selectedCountry = useMemo(
    () => getBusinessCountryOption(value),
    [value],
  );
  const options = useMemo<CountryComboboxOption[]>(
    () =>
      businessCountryOptions.map((countryOption) => ({
        countryCode: countryOption.code,
        currencyCode: countryOption.currencyCode,
        flag: countryOption.flag,
        label: countryOption.label,
        searchText: `${countryOption.label} ${countryOption.code} ${countryOption.currencyCode}`,
        value: countryOption.code,
      })),
    [],
  );

  return (
    <Combobox
      aria-invalid={ariaInvalid}
      autoFocus={autoFocus}
      buttonClassName={buttonClassName}
      disabled={disabled}
      emptyMessage="No countries found."
      groupHeading="Countries"
      id={id}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      renderOption={(option) => (
        <div
          className={cn(
            "flex min-w-0 items-center",
            showFlags ? "gap-2" : "gap-0",
          )}
        >
          {showFlags ? (
            <span aria-hidden="true" className="shrink-0 text-base leading-none">
              {option.flag}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{option.label}</p>
            <p className="text-xs text-muted-foreground">
              {option.countryCode} - {option.currencyCode}
            </p>
          </div>
        </div>
      )}
      renderValue={() =>
        selectedCountry ? (
          showFlags ? (
            <span className="flex min-w-0 items-center gap-2 text-left">
              <span aria-hidden="true" className="shrink-0 text-base leading-none">
                {selectedCountry.flag}
              </span>
              <span className="truncate">{selectedCountry.label}</span>
            </span>
          ) : (
            <span className="truncate text-left">{selectedCountry.label}</span>
          )
        ) : null
      }
      searchable
      searchPlaceholder={searchPlaceholder}
      value={value}
    />
  );
}
