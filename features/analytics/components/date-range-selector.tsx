"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { cn } from "@/lib/utils";

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

type DateRangeSelectorProps = {
  currentPreset: DateRangePreset;
  customSince?: string;
  customUntil?: string;
};

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "custom", label: "Custom" },
];

const MAX_RANGE_DAYS = 365;

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }
  return parsed;
}

function formatDateLabel(value: string): string {
  const date = parseDateString(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Validates a custom date range.
 * Returns an error message if invalid, or null if valid.
 */
export function validateDateRange(
  since: string | undefined,
  until: string | undefined,
): string | null {
  if (!since || !until) return "Both start and end dates are required.";

  const start = parseDateString(since);
  const end = parseDateString(until);

  if (!start || !end) return "Invalid date format.";
  if (start >= end) return "Start date must be before end date.";

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > MAX_RANGE_DAYS) {
    return `Date range cannot exceed ${MAX_RANGE_DAYS} days.`;
  }

  return null;
}

export function DateRangeSelector({
  currentPreset,
  customSince,
  customUntil,
}: DateRangeSelectorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useProgressRouter();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sinceDate, setSinceDate] = useState<Date | undefined>(
    customSince ? parseDateString(customSince) : undefined,
  );
  const [untilDate, setUntilDate] = useState<Date | undefined>(
    customUntil ? parseDateString(customUntil) : undefined,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const navigate = useCallback(
    (preset: DateRangePreset, since?: string, until?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      // Remove all date-related params first
      params.delete("range");
      params.delete("since");
      params.delete("until");

      if (preset === "custom" && since && until) {
        params.set("since", since);
        params.set("until", until);
      } else if (preset !== "30d") {
        // 30d is the default, so no param needed
        params.set("range", preset);
      }

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      router.push(href);
    },
    [pathname, searchParams, router],
  );

  const handlePresetClick = useCallback(
    (preset: DateRangePreset) => {
      if (preset === "custom") {
        setPopoverOpen(true);
        return;
      }
      setValidationError(null);
      navigate(preset);
    },
    [navigate],
  );

  const handleApplyCustomRange = useCallback(() => {
    const since = sinceDate ? toDateString(sinceDate) : undefined;
    const until = untilDate ? toDateString(untilDate) : undefined;

    const error = validateDateRange(since, until);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setPopoverOpen(false);
    navigate("custom", since, until);
  }, [sinceDate, untilDate, navigate]);

  const customLabel = useMemo(() => {
    if (currentPreset !== "custom" || !customSince || !customUntil) {
      return "Custom";
    }
    return `${formatDateLabel(customSince)} – ${formatDateLabel(customUntil)}`;
  }, [currentPreset, customSince, customUntil]);

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Date range">
      {PRESETS.map((preset) => {
        if (preset.value === "custom") {
          return (
            <Popover
              key="custom"
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant={currentPreset === "custom" ? "outline" : "ghost"}
                  size="sm"
                  className={cn(
                    currentPreset === "custom" &&
                      "bg-[var(--control-accent-bg)] border-border/60 text-foreground shadow-[var(--control-shadow)]",
                  )}
                  aria-pressed={currentPreset === "custom"}
                >
                  <CalendarIcon data-icon="inline-start" />
                  {customLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-4">
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium">Custom range</div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Start
                      </span>
                      <Calendar
                        mode="single"
                        selected={sinceDate}
                        onSelect={(date) => {
                          setSinceDate(date ?? undefined);
                          setValidationError(null);
                        }}
                        disabled={{ after: new Date() }}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        End
                      </span>
                      <Calendar
                        mode="single"
                        selected={untilDate}
                        onSelect={(date) => {
                          setUntilDate(date ?? undefined);
                          setValidationError(null);
                        }}
                        disabled={{ after: new Date() }}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                  {validationError ? (
                    <p className="text-xs text-destructive">
                      {validationError}
                    </p>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={handleApplyCustomRange}
                    disabled={!sinceDate || !untilDate}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <Button
            key={preset.value}
            variant={currentPreset === preset.value ? "outline" : "ghost"}
            size="sm"
            className={cn(
              currentPreset === preset.value &&
                "bg-[var(--control-accent-bg)] border-border/60 text-foreground shadow-[var(--control-shadow)]",
            )}
            aria-pressed={currentPreset === preset.value}
            onClick={() => handlePresetClick(preset.value)}
          >
            {preset.label}
          </Button>
        );
      })}
    </div>
  );
}
