"use client";

import { Briefcase, FileText, Inbox, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AdminOverviewStat } from "@/features/admin/components/overview/admin-overview-stats";

const ICONS = {
  users: Users,
  businesses: Briefcase,
  inquiries: Inbox,
  quotes: FileText,
} as const;

/**
 * KPI tile row for the admin Overview.
 *
 * Canonical shadcn composition (`Card` + `Badge`) instead of the BoardUI
 * `StatCards` the page used before. Accepts serializable icon keys from the
 * server and resolves them to icon components here, because component
 * references cannot cross the server → client boundary.
 */
export function AdminOverviewStatCards({
  stats,
}: {
  stats: AdminOverviewStat[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = ICONS[stat.icon];

        return (
          <Card key={stat.label}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="control-surface flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/75 text-muted-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
                <Badge variant={stat.variant}>{stat.delta}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {stat.caption}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
