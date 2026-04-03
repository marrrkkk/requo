import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverviewKpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function OverviewKpiCard({
  title,
  value,
  description,
  icon: Icon,
}: OverviewKpiCardProps) {
  return (
    <Card className="border-border/80 bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-0">
        <div className="min-w-0">
          <p className="meta-label">{title}</p>
          <CardTitle className="mt-3 text-3xl tracking-tight">{value}</CardTitle>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <CardDescription className="text-sm leading-6">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
