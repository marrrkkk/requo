import type { WorkspaceAnalyticsTrendPoint } from "@/features/analytics/types";
import {
  formatAnalyticsPercent,
  getTrendBarHeight,
} from "@/features/analytics/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverviewHealthCardProps = {
  acceptanceRate: number;
  inquiryCoverageRate: number;
  newInquiryCount: number;
  quoteAttentionCount: number;
  recentTrend: WorkspaceAnalyticsTrendPoint[];
};

export function OverviewHealthCard({
  acceptanceRate,
  inquiryCoverageRate,
  newInquiryCount,
  quoteAttentionCount,
  recentTrend,
}: OverviewHealthCardProps) {
  const maxInquiries = Math.max(...recentTrend.map((point) => point.inquiries), 1);

  return (
    <Card className="border-border/80 bg-card">
      <CardHeader className="gap-2">
        <CardTitle>Pipeline health</CardTitle>
        <CardDescription>
          Compact signal on coverage, conversion, and weekly momentum.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3">
          <HealthMetric
            label="Inquiry coverage"
            value={formatAnalyticsPercent(inquiryCoverageRate)}
            helper="Inquiries already moved into a quote."
          />
          <HealthMetric
            label="Quote acceptance"
            value={formatAnalyticsPercent(acceptanceRate)}
            helper="Sent quotes that converted into accepted work."
          />
          <HealthMetric
            label="New inquiries"
            value={`${newInquiryCount}`}
            helper="Requests waiting for review."
          />
          <HealthMetric
            label="Quote follow-up"
            value={`${quoteAttentionCount}`}
            helper="Open quote work that still needs attention."
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-background/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="meta-label">Six-week inquiry trend</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Weekly volume with accepted quotes noted below.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-6 gap-2">
            {recentTrend.map((point) => (
              <div className="flex flex-col items-center gap-2" key={point.weekStart}>
                <div className="flex h-24 w-full items-end rounded-full bg-muted/35 px-1.5 py-1.5">
                  <div
                    className="w-full rounded-full bg-primary/85"
                    style={{
                      height: getTrendBarHeight(point.inquiries, maxInquiries),
                    }}
                  />
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {point.label}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {point.inquiries}
                  </p>
                  <p className="text-[0.72rem] text-muted-foreground">
                    {point.acceptedQuotes} accepted
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="meta-label">{label}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
        </div>
        <p className="text-lg font-semibold tracking-tight text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}
