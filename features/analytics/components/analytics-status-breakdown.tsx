import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import type { WorkspaceAnalyticsStatusCount } from "@/features/analytics/types";

export function AnalyticsStatusBreakdown({
  rows,
}: {
  rows: WorkspaceAnalyticsStatusCount[];
}) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <Card className="bg-background/75">
      <CardHeader className="gap-2">
        <CardTitle>Status breakdown</CardTitle>
        <CardDescription>
          Current inquiry volume by workflow state across the workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            className="rounded-3xl border bg-background/80 p-4"
            key={row.status}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <InquiryStatusBadge status={row.status} />
                <span className="text-sm font-medium text-foreground">
                  {row.count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary/75"
                  style={{
                    width: `${Math.max(
                      10,
                      Math.round((row.count / maxCount) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {!rows.some((row) => row.count > 0) ? (
          <div className="rounded-3xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BarChart3 />
              <span>Status counts will fill in once inquiries start arriving.</span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
