import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FunnelStep } from "@/features/analytics/types";
import { formatPercent } from "@/features/analytics/utils";

export function AnalyticsFunnel({ steps }: { steps: FunnelStep[] }) {
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>Inquiry funnel</CardTitle>
        <CardDescription>
          How visitors convert through your pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const prevCount = i > 0 ? steps[i - 1].count : null;
          const convRate =
            prevCount && prevCount > 0 ? step.count / prevCount : null;

          return (
            <div className="soft-panel p-4 shadow-none" key={step.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="meta-label">Step {i + 1}</p>
                  <p className="mt-1 text-base font-semibold tracking-tight text-foreground">
                    {step.label}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                    {step.count.toLocaleString()}
                  </p>
                  {convRate !== null ? (
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {formatPercent(convRate)} from prior
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
          );
        })}
      </CardContent>
    </Card>
  );
}
