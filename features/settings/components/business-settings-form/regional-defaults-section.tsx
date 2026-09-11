"use client";

import { CountryCombobox } from "@/components/shared/country-combobox";
import { Combobox } from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  businessCurrencyOptions,
  resolveCurrencyForCountry,
} from "@/features/businesses/locale";
import { GeneralSettingsSection } from "./section";

type RegionalDefaultsSectionProps = {
  countryCode: string;
  countryCodeError: string | undefined;
  defaultCurrency: string;
  defaultCurrencyError: string | undefined;
  isPending: boolean;
  onCountryChange: (value: string, resolvedCurrency: string | null) => void;
  onCurrencyChange: (value: string) => void;
};

export function RegionalDefaultsSection({
  countryCode,
  countryCodeError,
  defaultCurrency,
  defaultCurrencyError,
  isPending,
  onCountryChange,
  onCurrencyChange,
}: RegionalDefaultsSectionProps) {
  return (
    <GeneralSettingsSection
      title="Regional defaults"
      description="Applied to new quotes and pricing entries. Existing quotes keep their original currency."
    >
      <div className="flex flex-col gap-5">
        <Field data-invalid={Boolean(countryCodeError) || undefined}>
          <FieldLabel htmlFor="settings-country-code">Country</FieldLabel>
          <FieldContent>
            <CountryCombobox
              aria-invalid={Boolean(countryCodeError) || undefined}
              disabled={isPending}
              id="settings-country-code"
              onValueChange={(value) => {
                const nextCurrency = resolveCurrencyForCountry(value);
                onCountryChange(value, nextCurrency);
              }}
              placeholder="Choose a country"
              searchPlaceholder="Search country"
              showFlags={false}
              value={countryCode}
            />
            <FieldError
              errors={
                countryCodeError ? [{ message: countryCodeError }] : undefined
              }
            />
          </FieldContent>
        </Field>

        <Field data-invalid={Boolean(defaultCurrencyError) || undefined}>
          <FieldLabel htmlFor="settings-default-currency">
            Default currency
          </FieldLabel>
          <FieldContent>
            <Combobox
              aria-invalid={Boolean(defaultCurrencyError) || undefined}
              disabled={isPending}
              id="settings-default-currency"
              onValueChange={onCurrencyChange}
              options={businessCurrencyOptions.map((currencyOption) => ({
                label: currencyOption.label,
                searchText: `${currencyOption.code} ${currencyOption.name}`,
                value: currencyOption.code,
              }))}
              placeholder="Choose a currency"
              searchPlaceholder="Search currency"
              value={defaultCurrency}
            />
            <FieldError
              errors={
                defaultCurrencyError
                  ? [{ message: defaultCurrencyError }]
                  : undefined
              }
            />
          </FieldContent>
        </Field>
      </div>
    </GeneralSettingsSection>
  );
}
