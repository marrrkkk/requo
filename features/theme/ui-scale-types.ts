/**
 * Interface scale (whole-app UI scale) preference.
 *
 * Three steps only, tied to the global typeset body targets:
 * - small:   13px body  (root 92.8571% — 13/14)
 * - default: 14px body  (root 100%)
 * - large:   15px body  (root 107.1429% — 15/14)
 *
 * Scaling rides the root `font-size`, so every rem-based Tailwind utility
 * (text, spacing, sizing, radius) scales proportionally — the whole app, not
 * just fonts. Pixel hairlines (1px borders/rings) intentionally stay fixed.
 */

export const uiScales = ["small", "default", "large"] as const;

export type UiScale = (typeof uiScales)[number];

export const uiScaleStorageKey = "requo-ui-scale";
export const uiScaleCookieKey = "requo-ui-scale";
export const uiScaleCookieMaxAgeSeconds = 60 * 60 * 24 * 365;
export const uiScaleDatasetAttribute = "ui-scale";

export const uiScaleLabels: Record<UiScale, string> = {
  small: "Small",
  default: "Default • 100%",
  large: "Large",
};

export const uiScaleDescriptions: Record<UiScale, string> = {
  small: "Compact 13px interface.",
  default: "Standard 14px interface.",
  large: "Roomier 15px interface.",
};

/** Root font-size percentage that yields the scale's body target. */
export const uiScaleRootFontSizePercent: Record<UiScale, number> = {
  small: 92.8571,
  default: 100,
  large: 107.1429,
};

export const defaultUiScale: UiScale = "default";

export function isUiScale(value: string): value is UiScale {
  return uiScales.includes(value as UiScale);
}

export function resolveUiScale(value: string | null | undefined): UiScale {
  return value && isUiScale(value) ? value : defaultUiScale;
}
