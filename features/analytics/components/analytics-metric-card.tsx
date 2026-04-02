import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function AnalyticsMetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="bg-background/75">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted/25">
          <Icon />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
