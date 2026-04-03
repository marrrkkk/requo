import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverviewListCardProps = {
  title: string;
  description: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
};

export function OverviewListCard({
  title,
  description,
  count,
  action,
  children,
}: OverviewListCardProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{count}</Badge>
            {action}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">{children}</CardContent>
    </Card>
  );
}
