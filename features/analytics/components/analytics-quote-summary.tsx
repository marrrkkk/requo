"use client";

import { ArrowUpRight, FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessAnalyticsData } from "@/features/analytics/types";

export function AnalyticsQuoteSummary({
  data,
}: {
  data: BusinessAnalyticsData["quoteSummary"];
}) {
  const decidedQuotes =
    data.acceptedQuotes + data.rejectedQuotes + data.expiredQuotes;
  const decided = decidedQuotes > 0;

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>Quote outcomes</CardTitle>
        <CardDescription>How sent quotes have resolved.</CardDescription>
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
        </div>

        {/* Visual outcome breakdown */}
        {decided ? (
          <div className="soft-panel flex flex-col gap-3 p-4 shadow-none">
            {/* Segmented bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
              {data.acceptedQuotes > 0 ? (
                <div
                  className="h-full bg-emerald-500/75 transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full dark:bg-emerald-400/70"
                  style={{
                    width: `${(data.acceptedQuotes / decidedQuotes) * 100}%`,
                  }}
                />
              ) : null}
              {data.rejectedQuotes > 0 ? (
                <div
                  className="h-full bg-red-400/70 transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full dark:bg-red-400/60"
                  style={{
                    width: `${(data.rejectedQuotes / decidedQuotes) * 100}%`,
                  }}
                />
              ) : null}
              {data.expiredQuotes > 0 ? (
                <div
                  className="h-full bg-orange-400/65 transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full dark:bg-orange-400/55"
                  style={{
                    width: `${(data.expiredQuotes / decidedQuotes) * 100}%`,
                  }}
                />
              ) : null}
            </div>

            {/* Legend + values */}
            <div className="grid gap-2 sm:grid-cols-3">
              <OutcomeStat
                color="bg-emerald-500/75 dark:bg-emerald-400/70"
                label="Accepted"
                value={data.acceptedQuotes}
                total={decidedQuotes}
              />
              <OutcomeStat
                color="bg-red-400/70 dark:bg-red-400/60"
                label="Rejected"
                value={data.rejectedQuotes}
                total={decidedQuotes}
              />
              <OutcomeStat
                color="bg-orange-400/65 dark:bg-orange-400/55"
                label="Expired"
                value={data.expiredQuotes}
                total={decidedQuotes}
              />
            </div>
          </div>
        ) : (
          <div className="soft-panel p-4 shadow-none">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Accepted" value={data.acceptedQuotes} />
              <MiniMetric label="Rejected" value={data.rejectedQuotes} />
              <MiniMetric label="Expired" value={data.expiredQuotes} />
            </div>
          </div>
        )}
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
    <div className="info-tile p-4 shadow-none">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-full border border-border/75 bg-secondary">
          <Icon className="size-4" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="meta-label">{label}</p>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function OutcomeStat({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="soft-panel bg-muted/15 px-3 py-3 shadow-none">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block size-2 rounded-full ${color}`} />
        <p className="meta-label">{label}</p>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <p className="text-base font-semibold tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-[0.68rem] font-medium text-muted-foreground">
          {pct}%
        </p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="soft-panel bg-muted/15 px-3 py-3 shadow-none">
      <p className="meta-label">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
