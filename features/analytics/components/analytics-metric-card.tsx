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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="meta-label">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
