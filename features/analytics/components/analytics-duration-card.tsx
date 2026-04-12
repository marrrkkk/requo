import type { LucideIcon } from "lucide-react";

import { HelpTooltip } from "@/components/shared/help-tooltip";
import { Card, CardContent } from "@/components/ui/card";

export function AnalyticsDurationCard({
  title,
  value,
  emptyLabel,
  description,
  tooltip,
  icon: Icon,
}: {
  title: string;
  value: string | null;
  emptyLabel?: string;
  description?: string;
  tooltip?: string;
  icon: LucideIcon;
}) {
  const displayValue = value ?? (emptyLabel || "—");

  return (
    <Card className="h-full border-border/75 bg-card/97" size="sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="meta-label">{title}</p>
              {tooltip ? (
                <HelpTooltip content={tooltip} label={title} />
              ) : null}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {displayValue}
            </p>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-accent/85 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <Icon className="size-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
