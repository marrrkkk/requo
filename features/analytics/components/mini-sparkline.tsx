import type { PeriodDeltaDirection } from "@/features/analytics/types";

type MiniSparklineProps = {
  points: number[]; // exactly 7 values
  direction: PeriodDeltaDirection;
  height?: number; // default 24
};

const STROKE_COLOR_MAP: Record<PeriodDeltaDirection, string> = {
  up: "var(--color-success)",
  down: "var(--color-destructive)",
  flat: "var(--color-muted-foreground)",
};

export function MiniSparkline({
  points,
  direction,
  height = 24,
}: MiniSparklineProps) {
  if (points.length === 0) return null;

  const strokeColor = STROKE_COLOR_MAP[direction];
  const padding = 2;
  const drawHeight = height - padding * 2;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const polylinePoints = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = padding + drawHeight - ((value - min) / range) * drawHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      aria-hidden="true"
    >
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
