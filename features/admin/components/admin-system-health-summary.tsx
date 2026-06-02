import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ADMIN_SYSTEM_PATH } from "@/features/admin/navigation";
import { getAdminHealthSummary } from "@/features/admin/queries";
import type { AdminHealthCheckCategory } from "@/lib/admin/health-checks";
import { cn } from "@/lib/utils";

const categoryLabels: Record<AdminHealthCheckCategory, string> = {
  core: "Core",
  email: "Email",
  ai: "AI",
  jobs: "Jobs",
  cache: "Cache",
  billing: "Billing",
  push: "Push",
};

type OverallStatus = "healthy" | "attention" | "critical";

function getOverallStatus(summary: {
  critical: number;
  warnings: number;
}): OverallStatus {
  if (summary.critical > 0) return "critical";
  if (summary.warnings > 0) return "attention";
  return "healthy";
}

const statusConfig: Record<
  OverallStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    accentClass: string;
    iconBgClass: string;
  }
> = {
  healthy: {
    label: "All systems operational",
    icon: CheckCircle2,
    accentClass: "border-l-primary",
    iconBgClass: "bg-primary/10 text-primary",
  },
  attention: {
    label: "Needs attention",
    icon: AlertTriangle,
    accentClass: "border-l-amber-500",
    iconBgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  critical: {
    label: "Critical issues detected",
    icon: XCircle,
    accentClass: "border-l-destructive",
    iconBgClass: "bg-destructive/10 text-destructive",
  },
};

function categoryStatusClass(status: string): string {
  if (status === "fail") return "border-destructive/60 text-destructive";
  if (status === "warn" || status === "mixed") return "border-amber-500/60 text-amber-600 dark:text-amber-400";
  if (status === "pass") return "border-primary/60 text-primary";
  return "border-border text-muted-foreground";
}

/**
 * System health banner for the admin dashboard.
 *
 * Uses a left-accent `section-panel` with a colored border to
 * communicate status at a glance. Category chips show per-service
 * health. Links to the full system page.
 */
export async function AdminSystemHealthBanner() {
  const summary = await getAdminHealthSummary();
  const overall = getOverallStatus(summary);
  const config = statusConfig[overall];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "section-panel border-l-4 px-5 py-5 sm:px-6 sm:py-6",
        config.accentClass,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl",
              config.iconBgClass,
            )}
          >
            <StatusIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
              {config.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {summary.critical} critical · {summary.warnings} warnings · {summary.healthy} healthy
            </p>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="shrink-0 self-start lg:self-center">
          <Link href={ADMIN_SYSTEM_PATH}>
            <Activity className="size-3.5" />
            System details
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Per-category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {(
          Object.entries(summary.byCategory) as [AdminHealthCheckCategory, string][]
        ).map(([category, status]) => (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
              categoryStatusClass(status),
            )}
            key={category}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                status === "fail" && "bg-destructive",
                status === "warn" || status === "mixed" ? "bg-amber-500" : "",
                status === "pass" && "bg-primary",
                status !== "fail" && status !== "warn" && status !== "mixed" && status !== "pass" && "bg-muted-foreground/40",
              )}
            />
            {categoryLabels[category]}
          </span>
        ))}
      </div>
    </div>
  );
}
