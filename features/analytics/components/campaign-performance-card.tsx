import { Megaphone } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CampaignPerformanceRow } from "@/features/analytics/queries";

type CampaignPerformanceCardProps = {
  campaigns: CampaignPerformanceRow[];
};

export function CampaignPerformanceCard({ campaigns }: CampaignPerformanceCardProps) {
  if (campaigns.length === 0) {
    return (
      <Card className="gap-0 bg-background/72">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            Campaign performance
          </CardTitle>
          <CardDescription>Track which campaigns drive inquiries.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No UTM data yet — campaign performance will appear here once visitors arrive from
            tracked links with UTM parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...campaigns.map((c) => c.count));
  const totalCount = campaigns.reduce((sum, c) => sum + c.count, 0);

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4 text-muted-foreground" />
          Campaign performance
        </CardTitle>
        <CardDescription>Inquiry counts by source and campaign.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {campaigns.map((campaign) => {
            const percentage = totalCount > 0 ? (campaign.count / totalCount) * 100 : 0;
            const barWidth = maxCount > 0 ? (campaign.count / maxCount) * 100 : 0;

            return (
              <div key={`${campaign.source}-${campaign.campaign}`} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {campaign.source}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {campaign.campaign}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {campaign.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-accent/60">
                  <div
                    className="h-full rounded-full bg-primary/75 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
