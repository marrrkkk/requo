import type { ReactNode } from "react";

import { DashboardPageSkeleton } from "@/components/shell/dashboard-page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardShellSkeletonProps = {
  children?: ReactNode;
};

export function DashboardShellSkeleton({
  children,
}: DashboardShellSkeletonProps) {
  return (
    <div className="group/sidebar-wrapper flex min-h-svh w-full bg-background">
      <div className="group peer hidden text-sidebar-foreground lg:block">
        <div
          className="relative w-[17.5rem] bg-transparent transition-[width]"
          data-slot="sidebar-gap"
        />
        <div
          className="fixed inset-y-0 left-0 z-10 hidden h-svh w-[17.5rem] border-r border-border/70 lg:flex"
          data-slot="sidebar-container"
        >
          <div className="flex size-full flex-col bg-sidebar">
            <div className="flex h-18 items-center px-5">
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <div className="border-t border-sidebar-border px-3 py-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
            <div className="flex flex-1 flex-col gap-1 px-3 py-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-9 w-full rounded-lg" key={index} />
              ))}
            </div>
            <div className="border-t border-sidebar-border px-3 py-3">
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <main className="relative flex min-w-0 flex-1 flex-col bg-transparent">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-3 md:flex-nowrap">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-56 rounded-md" />
              </div>
              <div className="hidden items-center gap-2 xl:flex">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="size-9 rounded-lg" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="dashboard-main">
            <div className="dashboard-content">
              {children ?? <DashboardPageSkeleton />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
