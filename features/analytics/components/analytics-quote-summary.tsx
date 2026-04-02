import {
  ArrowUpRight,
  CircleCheckBig,
  FileText,
  ShieldAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceAnalyticsData } from "@/features/analytics/types";
import { formatAnalyticsPercent } from "@/features/analytics/utils";

export function AnalyticsQuoteSummary({
  data,
}: {
  data: WorkspaceAnalyticsData["quoteSummary"];
}) {
  return (
    <Card className="bg-background/75">
      <CardHeader className="gap-2">
        <CardTitle>Quote conversion summary</CardTitle>
        <CardDescription>
          Basic signal on how quotes are progressing from draft to accepted.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryTile
            icon={FileText}
            label="Total quotes"
            value={`${data.totalQuotes}`}
          />
          <SummaryTile
            icon={ArrowUpRight}
            label="Sent quotes"
            value={`${data.sentQuotes}`}
          />
          <SummaryTile
            icon={CircleCheckBig}
            label="Accepted rate"
            value={formatAnalyticsPercent(data.acceptanceRate)}
          />
          <SummaryTile
            icon={ShieldAlert}
            label="Inquiry coverage"
            value={formatAnalyticsPercent(data.inquiryCoverageRate)}
          />
        </div>

        <div className="rounded-[1.55rem] border bg-background/80 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Accepted" value={data.acceptedQuotes} />
            <MiniMetric label="Rejected" value={data.rejectedQuotes} />
            <MiniMetric label="Expired" value={data.expiredQuotes} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.45rem] border bg-background/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl border bg-muted/20">
          <Icon className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-muted/15 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
