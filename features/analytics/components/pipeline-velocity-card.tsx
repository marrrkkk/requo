import { Timer } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsMetricCard } from "@/features/analytics/components/analytics-metric-card";
import type { PipelineVelocity } from "@/features/analytics/types";

export function PipelineVelocityCard({ data }: { data: PipelineVelocity }) {
  const { medianDays, dataPointCount } = data;

  const displayValue =
    medianDays !== null ? `${medianDays}d` : "Insufficient data";

  const description =
    medianDays !== null
      ? `Based on ${dataPointCount} accepted quote${dataPointCount === 1 ? "" : "s"}`
      : "Fewer than 3 accepted quotes in this period";

  return (
    <AnalyticsMetricCard
      icon={Timer}
      title="Pipeline velocity"
      value={displayValue}
      description={description}
      tooltip="Median days from inquiry submission to quote acceptance."
    />
  );
}
