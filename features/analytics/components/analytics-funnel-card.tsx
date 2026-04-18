import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAnalyticsPercent } from "@/features/analytics/utils";

type AnalyticsFunnelStep = {
  label: string;
  count: number;
  detail: string;
  conversionRate?: number | null;
};

export function AnalyticsFunnelCard({
  title,
  description,
  steps,
}: {
  title: string;
  description: string;
  steps: AnalyticsFunnelStep[];
}) {
  const maxCount = Math.max(...steps.map((step) => step.count), 1);

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <div className="soft-panel p-4 shadow-none" key={step.label}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="meta-label">Step {index + 1}</p>
                <p className="mt-1 text-base font-semibold tracking-tight text-foreground">
                  {step.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {step.detail}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {step.count.toLocaleString()}
                </p>
                {step.conversionRate !== undefined && step.conversionRate !== null ? (
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {formatAnalyticsPercent(step.conversionRate)} from prior step
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/35">
              <div
                className="h-full rounded-full bg-primary/75 transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(step.count > 0 ? 3 : 0, Math.round((step.count / maxCount) * 100))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
