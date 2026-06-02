import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Structural loading state for the admin console shell.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      <div className="fixed inset-y-0 left-0 z-20 hidden w-[17.5rem] border-r border-sidebar-border bg-sidebar lg:block">
        <div className="flex min-h-9 items-center justify-between px-3 py-1.5 sm:py-2">
          <BrandMark
            className="min-w-0 px-2 py-1.5"
            collapseLabel
            href="/"
            subtitle="Admin"
          />
          <Skeleton className="size-7 shrink-0 rounded-md" />
        </div>
        <div className="border-t border-sidebar-border" />
        <nav className="flex flex-col gap-1 px-4 pt-4">
          {[
            "Dashboard",
            "System",
            "Users",
            "Businesses",
            "Subscriptions",
            "Audit",
          ].map((label) => (
            <div
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/70"
              key={label}
            >
              <Skeleton className="size-4 shrink-0 rounded" />
              <span>{label}</span>
            </div>
          ))}
        </nav>
      </div>

      <div className="lg:pl-[17.5rem]">
        <header className="dashboard-topbar flex items-center">
          <div className="dashboard-topbar-inner min-w-0 flex-1">
            <div className="flex min-h-9 min-w-0 items-center gap-2 md:gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-md lg:hidden" />
              <span
                aria-hidden="true"
                className="hidden h-3.5 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="hidden min-w-0 flex-1 gap-2 md:flex">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="flex min-w-0 flex-col gap-6 pb-16 sm:gap-7 xl:pb-24">
              {/* Page header */}
              <div className="flex flex-col gap-3">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-9 w-40 rounded-md" />
                <Skeleton className="h-4 w-80 rounded" />
              </div>

              {/* Health banner */}
              <div className="section-panel border-l-4 border-l-border px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-11 shrink-0 rounded-xl" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-48 rounded" />
                    <Skeleton className="h-4 w-64 rounded" />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton className="h-7 w-16 rounded-md" key={i} />
                  ))}
                </div>
              </div>

              {/* Platform stats */}
              <div className="flex flex-col gap-4">
                <Skeleton className="h-3 w-16 rounded" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div className="section-panel flex flex-col gap-4 px-5 py-5" key={`stat-${i}`}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-lg" />
                        <Skeleton className="h-4 w-24 rounded" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-8 w-16 rounded" />
                        <Skeleton className="h-4 w-32 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity stats */}
              <div className="flex flex-col gap-4">
                <Skeleton className="h-3 w-32 rounded" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div className="section-panel flex flex-col gap-4 px-5 py-5" key={`act-${i}`}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-lg" />
                        <Skeleton className="h-4 w-24 rounded" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-8 w-12 rounded" />
                        <Skeleton className="h-4 w-40 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick access */}
              <div className="flex flex-col gap-4">
                <Skeleton className="h-3 w-20 rounded" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div className="soft-panel flex items-start gap-4 px-4 py-4" key={`quick-${i}`}>
                      <Skeleton className="size-9 shrink-0 rounded-lg" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-3 w-44 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
