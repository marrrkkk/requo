"use client";

import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import type { BusinessAnalyticsStatusCount } from "@/features/analytics/types";

export function AnalyticsStatusBreakdown({
  rows,
}: {
  rows: BusinessAnalyticsStatusCount[];
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>Status breakdown</CardTitle>
        <CardDescription>Current inquiry workload by status.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;

          return (
            <div
              className="group soft-panel p-3.5 shadow-none transition-colors hover:bg-accent/30"
              key={row.status}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <InquiryStatusBadge status={row.status} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.68rem] font-medium text-muted-foreground">
                    {pct}%
                  </span>
                  <span className="min-w-6 text-right text-sm font-semibold tabular-nums text-foreground">
                    {row.count}
                  </span>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(row.count > 0 ? 3 : 0, Math.round((row.count / maxCount) * 100))}%`,
                  }}
                />
              </div>
            </div>
          );
        })}

        {!rows.some((row) => row.count > 0) ? (
          <div className="soft-panel border-dashed bg-muted/15 p-4 text-sm text-muted-foreground shadow-none">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              <span>
                Status counts will appear once inquiries start coming in.
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
