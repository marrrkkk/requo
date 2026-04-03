import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type DashboardPageProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardPage({
  children,
  className,
}: DashboardPageProps) {
  return <div className={cn("dashboard-page", className)}>{children}</div>;
}

type DashboardToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardToolbar({
  children,
  className,
}: DashboardToolbarProps) {
  return <div className={cn("toolbar-panel", className)}>{children}</div>;
}

type DashboardStatsGridProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardStatsGrid({
  children,
  className,
}: DashboardStatsGridProps) {
  return <div className={cn("dashboard-stats", className)}>{children}</div>;
}

type DashboardDetailLayoutProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardDetailLayout({
  children,
  className,
}: DashboardDetailLayoutProps) {
  return <div className={cn("dashboard-detail-layout", className)}>{children}</div>;
}

type DashboardSidebarStackProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardSidebarStack({
  children,
  className,
}: DashboardSidebarStackProps) {
  return <div className={cn("dashboard-side-stack", className)}>{children}</div>;
}

type DashboardActionsRowProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardActionsRow({
  children,
  className,
}: DashboardActionsRowProps) {
  return <div className={cn("dashboard-actions", className)}>{children}</div>;
}

type DashboardSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
};

export function DashboardSection({
  title,
  description,
  action,
  children,
  footer,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
}: DashboardSectionProps) {
  const hasHeader = Boolean(title || description || action);

  return (
    <Card className={cn("gap-0 border-border/75 bg-card/96", className)}>
      {hasHeader ? (
        <CardHeader className={cn("gap-3 pb-5", headerClassName)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title ? <CardTitle>{title}</CardTitle> : null}
              {description ? (
                <CardDescription className={cn(title ? "mt-1.5" : null)}>
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? (
              <DashboardActionsRow className="shrink-0 sm:justify-end">
                {action}
              </DashboardActionsRow>
            ) : null}
          </div>
        </CardHeader>
      ) : null}

      <CardContent
        className={cn(
          "dashboard-section-body",
          hasHeader ? "pt-0" : "pt-6",
          contentClassName,
        )}
      >
        {children}
      </CardContent>

      {footer ? (
        <CardFooter
          className={cn(
            "dashboard-actions justify-start sm:justify-end",
            footerClassName,
          )}
        >
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

type DashboardTableContainerProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function DashboardTableContainer({
  children,
  className,
  innerClassName,
}: DashboardTableContainerProps) {
  return (
    <div className={cn("dashboard-table-shell", className)}>
      <div className={cn("dashboard-table-shell-inner", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

type DashboardEmptyStateProps = {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  variant?: "page" | "section" | "flat";
};

const emptyStateVariantClassNames = {
  page: "",
  section: "border",
  flat: "rounded-none border-0 bg-transparent px-6 py-10",
} as const;

export function DashboardEmptyState({
  title,
  description,
  action,
  icon: Icon,
  className,
  variant = "page",
}: DashboardEmptyStateProps) {
  return (
    <Empty
      className={cn(emptyStateVariantClassNames[variant], className)}
    >
      <EmptyHeader>
        {Icon ? (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
