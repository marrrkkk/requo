import { DashboardPageSkeleton } from "@/components/shell/dashboard-page-skeleton";
import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Progressive shell skeleton.
 *
 * Renders the structural frame (sidebar chrome, topbar chrome, brand mark)
 * immediately so users see the app layout before dynamic content resolves.
 * Only business-specific and user-specific parts are skeletonized.
 */
export function DashboardShellSkeleton() {
  return (
    <div className="group/sidebar-wrapper flex min-h-svh w-full bg-background">
      {/* Sidebar frame */}
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
            {/* Real brand mark */}
            <div className="flex min-h-9 items-center px-5 py-1.5 sm:py-2">
              <BrandMark collapseLabel className="min-w-0 px-2 py-1.5" subtitle={null} />
            </div>
            {/* Business switcher skeleton */}
            <div className="border-t border-sidebar-border px-3 py-3">
              <div className="w-full rounded-[1.1rem] border border-sidebar-border/90 bg-background/92 p-3.5">
                <div className="flex items-start gap-3.5">
                  <Skeleton className="size-14 shrink-0 rounded-[0.9rem]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-14 rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-3.5 w-20 rounded-md" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            </div>
            {/* Navigation items skeleton */}
            <div className="flex flex-1 flex-col gap-1 px-3 py-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton className="h-10 w-full rounded-lg" key={index} />
              ))}
            </div>
            {/* User menu skeleton */}
            <div className="border-t border-sidebar-border px-3 py-3">
              <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                <Skeleton className="size-9 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-3 w-36 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-transparent">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-2.5 md:flex-nowrap">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <span
                aria-hidden="true"
                className="hidden h-3.5 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="hidden h-9 w-64 rounded-lg md:block lg:w-80" />
                <Skeleton className="size-9 rounded-lg" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="dashboard-main">
            <div className="dashboard-content">
              <DashboardPageSkeleton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
