import { Globe } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TopSourcesCardProps = {
  sources: Array<{ domain: string; count: number }>;
  totalViews: number;
};

export function TopSourcesCard({ sources, totalViews }: TopSourcesCardProps) {
  if (sources.length === 0) {
    return (
      <Card className="gap-0 bg-background/72">
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            Top sources
          </CardTitle>
          <CardDescription>Where your visitors come from.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No referrer data yet — traffic sources will appear here once visitors arrive from
            external links.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...sources.map((s) => s.count));

  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          Top sources
        </CardTitle>
        <CardDescription>Top 5 referrer domains by visit count.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {sources.map((source) => {
            const percentage = totalViews > 0 ? (source.count / totalViews) * 100 : 0;
            const barWidth = maxCount > 0 ? (source.count / maxCount) * 100 : 0;

            return (
              <div key={source.domain} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {source.domain}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {source.count} ({percentage.toFixed(1)}%)
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
