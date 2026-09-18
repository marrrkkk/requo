import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Semantic status tones — the single vocabulary for status colour in the app.
 *
 * `neutral`, `info`, `success`, `warning`, and `danger` are backed by global
 * colour tokens (`app/globals.css`), so they need no `dark:` pair: the token
 * itself flips with the theme.
 *
 * `progress`, `active`, `highlight`, and `attention` are decorative hues with
 * no semantic meaning. They are centralized here so that no feature code has to
 * reach for raw palette utilities — see `DESIGN.md`.
 *
 * Note: the tone is named `highlight`, not `accent`, because `--accent` is
 * already a *surface* token.
 */
export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "progress"
  | "active"
  | "highlight"
  | "attention";

export const statusTones: readonly StatusTone[] = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "progress",
  "active",
  "highlight",
  "attention",
] as const;

/** Tones backed by a global token; these must not carry raw palette classes. */
export const tokenBackedStatusTones: readonly StatusTone[] = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
] as const;

/**
 * The one tone -> class map.
 *
 * Token-backed tones carry no `dark:` pair. The four decorative hues do,
 * because they have no token to flip for them.
 */
export const statusToneClassNames: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/30 bg-info/15 text-info",
  success: "border-success/30 bg-success/15 text-success",
  warning: "border-warning/30 bg-warning/15 text-warning",
  danger: "border-destructive/30 bg-destructive/15 text-destructive",
  progress:
    "border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/12 dark:text-indigo-200",
  active:
    "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:border-cyan-500/25 dark:bg-cyan-500/12 dark:text-cyan-200",
  highlight:
    "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/12 dark:text-violet-200",
  attention:
    "border-orange-500/30 bg-orange-500/15 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/12 dark:text-orange-200",
};

/**
 * The props the badge actually sets on an icon — deliberately minimal.
 *
 * Both lucide and `@remixicon/react` components are assignable to this, but a
 * full `SVGProps<SVGSVGElement>` is not: remixicon narrows `children` to
 * `undefined`, so it fails the contravariant props check against the wider
 * type. Declaring only what we pass keeps both libraries usable here.
 */
type StatusIconProps = {
  className?: string;
  "data-icon"?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

type StatusIcon = ComponentType<StatusIconProps>;

export type StatusBadgeProps = {
  /** The semantic tone. Drives colour only — never the meaning. */
  tone: StatusTone;
  /**
   * Always rendered. Colour must never carry the meaning on its own, so the
   * label is required rather than optional.
   */
  label: string;
  /** Optional leading glyph, rendered `aria-hidden` (the label carries meaning). */
  icon?: StatusIcon;
  size?: "default" | "sm";
  className?: string;
};

/**
 * The single status pill for the product.
 *
 * Composes `Badge variant="status"`, which carries no background or border
 * colour, so the tone classes win through `tailwind-merge` without needing
 * `!important`. Do not restyle this per feature — add a tone instead.
 */
export function StatusBadge({
  tone,
  label,
  icon: Icon,
  size = "default",
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      data-tone={tone}
      variant="status"
      className={cn(
        "shrink-0 rounded-full",
        size === "sm" ? "h-5 px-2" : null,
        statusToneClassNames[tone],
        className,
      )}
    >
      {Icon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
}
