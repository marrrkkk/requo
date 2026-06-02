import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  AdminHealthCheckCategory,
  AdminHealthCheckResult,
} from "@/lib/admin/health-checks";
import { cn } from "@/lib/utils";

import {
  checkStatusBorderClass,
  checkStatusLabel,
  systemCategoryIcons,
} from "@/features/admin/components/system/system-status-shared";

function checkStatusBadgeVariant(
  status: AdminHealthCheckResult["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pass":
      return "default";
    case "fail":
      return "destructive";
    case "warn":
      return "secondary";
    default:
      return "outline";
  }
}

type AdminHealthCheckCardProps = {
  check: AdminHealthCheckResult;
  category: AdminHealthCheckCategory;
};

export function AdminHealthCheckCard({
  check,
  category,
}: AdminHealthCheckCardProps) {
  const Icon: LucideIcon = systemCategoryIcons[category];

  return (
    <article
      className={cn(
        "soft-panel flex flex-col gap-3 border-l-4 px-4 py-4",
        checkStatusBorderClass(check.status),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70",
            "bg-accent/85 text-accent-foreground",
            "dark:border-white/8 dark:bg-accent",
          )}
        >
          <Icon className="size-4" />
        </div>
        <Badge variant={checkStatusBadgeVariant(check.status)}>
          {checkStatusLabel(check.status)}
        </Badge>
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{check.name}</h3>
        {check.message ? (
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {check.message}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-3">
        {check.duration != null ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span>
              Response time{" "}
              <span className="font-medium tabular-nums text-foreground">
                {check.duration}ms
              </span>
            </span>
          </p>
        ) : null}
        {check.hint && check.status !== "pass" ? (
          <p className="text-xs leading-5 text-muted-foreground">{check.hint}</p>
        ) : null}
      </div>
    </article>
  );
}
