import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Flame, Sun, Snowflake } from "lucide-react";
import type { Temperature } from "@/features/inquiries/qualification/types";

const temperatureConfig: Record<
  Temperature,
  { label: string; icon: typeof Flame; badgeClassName: string; dotClassName: string }
> = {
  hot: {
    label: "Hot",
    icon: Flame,
    badgeClassName:
      "!border-rose-500/30 !bg-rose-500/15 !text-rose-800 dark:!border-rose-500/25 dark:!bg-rose-500/12 dark:!text-rose-200",
    dotClassName: "bg-rose-500",
  },
  warm: {
    label: "Warm",
    icon: Sun,
    badgeClassName:
      "!border-amber-500/30 !bg-amber-500/15 !text-amber-800 dark:!border-amber-500/25 dark:!bg-amber-500/12 dark:!text-amber-200",
    dotClassName: "bg-amber-500",
  },
  cold: {
    label: "Cold",
    icon: Snowflake,
    badgeClassName:
      "!border-sky-500/30 !bg-sky-500/15 !text-sky-800 dark:!border-sky-500/25 dark:!bg-sky-500/12 dark:!text-sky-200",
    dotClassName: "bg-sky-500",
  },
};

type TemperatureBadgeProps = {
  temperature: Temperature | null;
  /** "badge" shows the full labeled badge; "dot" shows a small colored circle */
  variant?: "badge" | "dot";
  className?: string;
};

export function TemperatureBadge({
  temperature,
  variant = "badge",
  className,
}: TemperatureBadgeProps) {
  if (!temperature) return null;

  const config = temperatureConfig[temperature];
  const Icon = config.icon;

  if (variant === "dot") {
    return (
      <span
        className={cn("inline-block size-2.5 shrink-0 rounded-full", config.dotClassName, className)}
        title={config.label}
        aria-label={`Priority: ${config.label}`}
        role="img"
      />
    );
  }

  return (
    <Badge
      className={cn("shrink-0 rounded-full", config.badgeClassName, className)}
      variant="secondary"
    >
      <Icon data-icon="inline-start" />
      {config.label}
    </Badge>
  );
}
