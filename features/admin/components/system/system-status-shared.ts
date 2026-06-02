import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Cloud,
  CreditCard,
  Mail,
  Server,
  Sparkles,
  Workflow,
  XCircle,
} from "lucide-react";

import type {
  AdminHealthCheckCategory,
  AdminHealthCheckStatus,
} from "@/lib/admin/health-checks";

export type SystemOverallStatus = "healthy" | "attention" | "critical";

export const systemCategoryLabels: Record<AdminHealthCheckCategory, string> = {
  core: "Core",
  email: "Email",
  ai: "AI",
  jobs: "Jobs",
  cache: "Cache",
  billing: "Billing",
  push: "Push",
};

export const systemCategoryTitles: Record<AdminHealthCheckCategory, string> = {
  core: "Core infrastructure",
  email: "Email delivery",
  ai: "AI providers",
  jobs: "Background jobs",
  cache: "Distributed cache",
  billing: "Billing",
  push: "Push notifications",
};

export const systemCategoryIcons: Record<AdminHealthCheckCategory, LucideIcon> = {
  core: Server,
  email: Mail,
  ai: Sparkles,
  jobs: Workflow,
  cache: Cloud,
  billing: CreditCard,
  push: BellRing,
};

export const systemCategoryOrder: AdminHealthCheckCategory[] = [
  "core",
  "email",
  "ai",
  "jobs",
  "cache",
  "billing",
  "push",
];

export function getSystemOverallStatus(counts: {
  critical: number;
  warnings: number;
}): SystemOverallStatus {
  if (counts.critical > 0) return "critical";
  if (counts.warnings > 0) return "attention";
  return "healthy";
}

export const systemOverallStatusConfig: Record<
  SystemOverallStatus,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    borderClass: string;
    iconClass: string;
    badgeClass: string;
  }
> = {
  healthy: {
    label: "All systems operational",
    description: "No critical issues in the latest connectivity check.",
    icon: CheckCircle2,
    borderClass: "border-l-primary",
    iconClass: "text-primary",
    badgeClass: "border-primary/20 bg-primary/10 text-primary",
  },
  attention: {
    label: "Needs attention",
    description: "Some integrations reported warnings. Review checks below.",
    icon: AlertTriangle,
    borderClass: "border-l-amber-500/80",
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass:
      "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  critical: {
    label: "Critical issues",
    description: "One or more core checks failed. Resolve before relying on prod.",
    icon: XCircle,
    borderClass: "border-l-destructive",
    iconClass: "text-destructive",
    badgeClass: "border-destructive/25 bg-destructive/10 text-destructive",
  },
};

export function checkStatusLabel(status: AdminHealthCheckStatus): string {
  switch (status) {
    case "pass":
      return "Healthy";
    case "fail":
      return "Critical";
    case "warn":
      return "Warning";
    case "skip":
      return "Skipped";
  }
}

export function checkStatusBorderClass(status: AdminHealthCheckStatus): string {
  switch (status) {
    case "pass":
      return "border-l-primary/80";
    case "fail":
      return "border-l-destructive";
    case "warn":
      return "border-l-amber-500/80";
    default:
      return "border-l-border";
  }
}

export function checkStatusDotClass(status: AdminHealthCheckStatus | string): string {
  if (status === "fail") return "bg-destructive";
  if (status === "warn" || status === "mixed") return "bg-amber-500";
  if (status === "pass") return "bg-primary";
  return "bg-muted-foreground/40";
}

export function categoryAggregateStatus(
  statuses: AdminHealthCheckStatus[],
): AdminHealthCheckStatus | "mixed" {
  if (statuses.some((s) => s === "fail")) return "fail";
  if (statuses.some((s) => s === "warn")) return "warn";
  if (statuses.every((s) => s === "pass")) return "pass";
  if (statuses.every((s) => s === "skip")) return "skip";
  return "mixed";
}

export function aggregateStatusLabel(
  status: AdminHealthCheckStatus | "mixed",
): string {
  if (status === "mixed") return "Mixed";
  return checkStatusLabel(status);
}
