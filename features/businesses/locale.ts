import countryToCurrency from "country-to-currency";
import currencyCodes from "currency-codes";
import countries from "i18n-iso-countries";
import englishCountryLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(englishCountryLocale);

const currencyCodeAliases: Record<string, string> = {
  VED: "VES",
};
const countryCurrencyMap = countryToCurrency as Record<string, string>;

export type BusinessCountryOption = {
  code: string;
  label: string;
  flag: string;
  currencyCode: string;
};

export type BusinessCurrencyOption = {
  code: string;
  name: string;
  label: string;
};

export function normalizeBusinessCountryCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeBusinessCurrencyCode(value: string) {
  const normalizedValue = value.trim().toUpperCase();

  return currencyCodeAliases[normalizedValue] ?? normalizedValue;
}

function getSupportedCurrencyCodes() {
  const fallbackCodes = currencyCodes.data.map((entry) => entry.code);
  const runtimeCodes =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("currency")
      : fallbackCodes;

  return new Set(
    runtimeCodes.map((code) => normalizeBusinessCurrencyCode(code)),
  );
}

const supportedCurrencyCodes = getSupportedCurrencyCodes();

export function getCountryFlagEmoji(countryCode: string) {
  const normalizedCountryCode = normalizeBusinessCountryCode(countryCode);

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    return "";
  }

  return Array.from(normalizedCountryCode)
    .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397))
    .join("");
}

export function resolveCurrencyForCountry(countryCode: string) {
  const normalizedCountryCode = normalizeBusinessCountryCode(countryCode);
  const mappedCurrencyCode = countryCurrencyMap[normalizedCountryCode];

  if (typeof mappedCurrencyCode !== "string") {
    return null;
  }

  const normalizedCurrencyCode =
    normalizeBusinessCurrencyCode(mappedCurrencyCode);

  return supportedCurrencyCodes.has(normalizedCurrencyCode)
    ? normalizedCurrencyCode
    : null;
}

const currencyOptionMap = new Map<string, BusinessCurrencyOption>();

for (const currencyEntry of currencyCodes.data) {
  const normalizedCurrencyCode = normalizeBusinessCurrencyCode(
    currencyEntry.code,
  );

  if (
    !supportedCurrencyCodes.has(normalizedCurrencyCode) ||
    currencyOptionMap.has(normalizedCurrencyCode)
  ) {
    continue;
  }

  currencyOptionMap.set(normalizedCurrencyCode, {
    code: normalizedCurrencyCode,
    name: currencyEntry.currency,
    label: `${normalizedCurrencyCode} · ${currencyEntry.currency}`,
  });
}

export const businessCurrencyOptions = Array.from(currencyOptionMap.values()).sort(
  (leftOption, rightOption) =>
    leftOption.code.localeCompare(rightOption.code),
);

const countryOptionMap = new Map<string, BusinessCountryOption>();
const countryNames = countries.getNames("en");

for (const [countryCode, label] of Object.entries(countryNames)) {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    continue;
  }

  const resolvedCurrencyCode = resolveCurrencyForCountry(countryCode);

  if (!resolvedCurrencyCode) {
    continue;
  }

  countryOptionMap.set(countryCode, {
    code: countryCode,
    label,
    flag: getCountryFlagEmoji(countryCode),
    currencyCode: resolvedCurrencyCode,
  });
}

export const businessCountryOptions = Array.from(countryOptionMap.values()).sort(
  (leftOption, rightOption) => leftOption.label.localeCompare(rightOption.label),
);

export function isSupportedBusinessCountryCode(value: string) {
  return countryOptionMap.has(normalizeBusinessCountryCode(value));
}

export function isSupportedBusinessCurrencyCode(value: string) {
  return currencyOptionMap.has(normalizeBusinessCurrencyCode(value));
}

export function getBusinessCountryOption(countryCode: string | null | undefined) {
  if (!countryCode) {
    return null;
  }

  return countryOptionMap.get(normalizeBusinessCountryCode(countryCode)) ?? null;
}

export function getBusinessCurrencyOption(
  currencyCode: string | null | undefined,
) {
  if (!currencyCode) {
    return null;
  }

  return (
    currencyOptionMap.get(normalizeBusinessCurrencyCode(currencyCode)) ?? null
  );
}
