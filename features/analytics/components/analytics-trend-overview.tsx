import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceAnalyticsTrendPoint } from "@/features/analytics/types";
import { getTrendBarHeight } from "@/features/analytics/utils";

export function AnalyticsTrendOverview({
  points,
}: {
  points: WorkspaceAnalyticsTrendPoint[];
}) {
  const maxInquiries = Math.max(...points.map((point) => point.inquiries), 1);

  return (
    <Card className="bg-background/75">
      <CardHeader className="gap-2">
        <CardTitle>Recent trend overview</CardTitle>
        <CardDescription>
          A simple six-week view of incoming inquiries and accepted quotes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {points.map((point) => (
            <div
              className="rounded-[1.6rem] border bg-background/80 p-4"
              key={point.weekStart}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {point.label}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Weekly snapshot
                  </p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-2xl border bg-muted/25">
                  <TrendingUp className="size-4" />
                </div>
              </div>

              <div className="mt-4 flex items-end gap-3">
                <div className="flex h-24 flex-1 items-end rounded-[1.2rem] border bg-muted/20 px-2 py-2">
                  <div
                    className="w-full rounded-full bg-primary/80"
                    style={{
                      height: getTrendBarHeight(point.inquiries, maxInquiries),
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {point.inquiries}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Inquiries
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <TrendMeta label="Won" value={point.won} />
                <TrendMeta label="Lost" value={point.lost} />
                <TrendMeta label="Accepted" value={point.acceptedQuotes} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendMeta({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
