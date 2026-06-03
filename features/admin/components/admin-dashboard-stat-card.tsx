import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminDashboardStatCardProps = {
  href: string;
  label: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  footer?: ReactNode;
  emphasize?: boolean;
};

/**
 * Admin stat card — a clickable tile showing a single KPI.
 *
 * Uses `section-panel` for the elevated surface treatment. The icon
 * sits in a tinted container, the value is large and prominent, and
 * the entire card links to the relevant admin list page.
 */
export function AdminDashboardStatCard({
  href,
  label,
  value,
  icon: Icon,
  description,
  footer,
  emphasize = false,
}: AdminDashboardStatCardProps) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "group section-panel flex flex-col gap-4 px-5 py-5",
        "transition-[border-color,box-shadow,transform]",
        "[transition-duration:var(--motion-duration-fast)]",
        "[transition-timing-function:var(--motion-ease-standard)]",
        "hover:shadow-[var(--surface-shadow-xl)] hover:border-primary/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {/* Header: icon + label */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12 dark:bg-primary/12 dark:group-hover:bg-primary/18">
          <Icon className="size-4" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>

      {/* Value */}
      <div className="min-w-0">
        <p
          className={cn(
            "font-heading text-[2rem] font-semibold leading-none tracking-tight tabular-nums",
            emphasize ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </p>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {/* Optional footer */}
      {footer ? (
        <div className="border-t border-border/60 pt-3">{footer}</div>
      ) : null}
    </Link>
  );
}
