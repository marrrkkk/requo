"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Annotation = {
  id: string;
  date: string;
  label: string;
  color?: string;
};

type AnnotationMarkerProps = {
  annotations: Annotation[];
  chartWidth: number;
  dateRange: { since: string; until: string };
};

const DEFAULT_MARKER_COLOR = "hsl(var(--muted-foreground))";

/**
 * Calculates the x-position of an annotation within the chart.
 * Formula: (annotationDate - since) / (until - since) × chartWidth
 */
export function calculateAnnotationX(
  annotationDate: string,
  since: string,
  until: string,
  chartWidth: number,
): number {
  const sinceMs = new Date(since).getTime();
  const untilMs = new Date(until).getTime();
  const dateMs = new Date(annotationDate).getTime();

  const rangeMs = untilMs - sinceMs;
  if (rangeMs <= 0) return 0;

  return ((dateMs - sinceMs) / rangeMs) * chartWidth;
}

/**
 * Checks if an annotation date falls within the visible date range.
 */
function isWithinRange(date: string, since: string, until: string): boolean {
  const dateMs = new Date(date).getTime();
  const sinceMs = new Date(since).getTime();
  const untilMs = new Date(until).getTime();
  return dateMs >= sinceMs && dateMs <= untilMs;
}

/**
 * Renders vertical dashed lines at annotation positions on the trend chart
 * with tooltips showing annotation label and date on hover.
 */
export function AnnotationMarker({
  annotations,
  chartWidth,
  dateRange,
}: AnnotationMarkerProps) {
  const { since, until } = dateRange;

  const visibleAnnotations = annotations.filter((a) =>
    isWithinRange(a.date, since, until),
  );

  if (visibleAnnotations.length === 0 || chartWidth <= 0) return null;

  return (
    <TooltipProvider>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {visibleAnnotations.map((annotation) => {
          const xPos = calculateAnnotationX(
            annotation.date,
            since,
            until,
            chartWidth,
          );
          const markerColor = annotation.color || DEFAULT_MARKER_COLOR;

          return (
            <Tooltip key={annotation.id}>
              <TooltipTrigger asChild>
                <div
                  className="pointer-events-auto absolute top-0 bottom-0 w-px cursor-pointer"
                  style={{
                    left: `${xPos}px`,
                    borderLeft: `1px dashed ${markerColor}`,
                  }}
                  role="img"
                  aria-label={`Annotation: ${annotation.label} on ${annotation.date}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{annotation.label}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(annotation.date).toLocaleDateString()}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
