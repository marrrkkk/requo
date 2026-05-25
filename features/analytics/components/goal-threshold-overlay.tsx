type GoalThresholdOverlayProps = {
  currentValue: number;
  targetValue: number;
  metricType: "rate" | "count";
};

/**
 * Determines the color class for the progress bar based on current vs target value.
 * - success (green) when currentValue ≥ targetValue
 * - destructive (red) when currentValue < 50% of targetValue
 * - warning (amber) otherwise
 */
export function getGoalThresholdColor(
  currentValue: number,
  targetValue: number,
): "success" | "destructive" | "warning" {
  if (currentValue >= targetValue) {
    return "success";
  }
  if (currentValue < targetValue * 0.5) {
    return "destructive";
  }
  return "warning";
}

const COLOR_CLASSES: Record<"success" | "destructive" | "warning", string> = {
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-amber-500",
};

/**
 * Renders a thin progress bar beneath the metric value indicating
 * how close the current value is to the goal threshold target.
 * Width is capped at 100% (currentValue/targetValue).
 */
export function GoalThresholdOverlay({
  currentValue,
  targetValue,
  metricType: _metricType,
}: GoalThresholdOverlayProps) {
  if (targetValue <= 0) return null;

  const progress = Math.min(currentValue / targetValue, 1);
  const color = getGoalThresholdColor(currentValue, targetValue);

  return (
    <div
      className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={currentValue}
      aria-valuemin={0}
      aria-valuemax={targetValue}
      aria-label={`Goal progress: ${Math.round(progress * 100)}% of target`}
    >
      <div
        className={`h-full rounded-full transition-all ${COLOR_CLASSES[color]}`}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
