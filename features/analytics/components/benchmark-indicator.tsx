import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { BenchmarkComparison, BenchmarkPosition } from "../utils/benchmark-comparison";

type BenchmarkIndicatorProps = {
  comparison: BenchmarkComparison;
};

const positionConfig: Record<
  BenchmarkPosition,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof ArrowUp }
> = {
  above: { label: "Above average", variant: "default", icon: ArrowUp },
  average: { label: "Average", variant: "secondary", icon: Minus },
  below: { label: "Below average", variant: "destructive", icon: ArrowDown },
};

/**
 * Displays a benchmark position indicator badge.
 * Shows "above average", "average", or "below average" relative to the
 * comparison group median. Only renders when the group has ≥ 10 businesses.
 */
export function BenchmarkIndicator({ comparison }: BenchmarkIndicatorProps) {
  const config = positionConfig[comparison.position];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className="gap-1 text-xs">
          <Icon className="size-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          Compared to {comparison.businessCount} similar businesses in your category
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

type BenchmarkIndicatorsProps = {
  comparisons: BenchmarkComparison[];
};

/**
 * Renders benchmark indicators for multiple metrics.
 * Gated behind `analyticsWorkflow` entitlement at the parent level.
 */
export function BenchmarkIndicators({ comparisons }: BenchmarkIndicatorsProps) {
  if (comparisons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {comparisons.map((comparison) => (
        <div key={comparison.metricKey} className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {metricLabels[comparison.metricKey] ?? comparison.metricKey}
          </span>
          <BenchmarkIndicator comparison={comparison} />
        </div>
      ))}
    </div>
  );
}

const metricLabels: Record<string, string> = {
  formConversionRate: "Conversion",
  quoteAcceptanceRate: "Acceptance",
  avgResponseHours: "Response time",
};
