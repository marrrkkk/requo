import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { adminNavigationGroups } from "@/features/admin/navigation";

/**
 * Cold-load fallback for the admin console.
 *
 * The console layout must resolve `requireAdminUser()` before it can render the
 * real shell, so this stands in for the whole chrome (rail + topbar + content)
 * during that first paint. Navigation labels are read from
 * `adminNavigationGroups` so the skeleton can never drift from the real rail.
 *
 * In-console navigations do **not** use this — they swap only the content area
 * (see `app/admin/(console)/loading.tsx`), because the layout's chrome persists.
 */
export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <div className="sticky top-0 hidden h-svh w-[16.25rem] shrink-0 lg:block">
        <div className="flex h-full w-full flex-col justify-between rounded-r-3xl border border-l-0 border-sidebar-border bg-sidebar p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <BrandMark href="/" subtitle="Admin" />
              <Skeleton className="size-5 rounded-md" />
            </div>

            <Skeleton className="h-9 w-full rounded-full" />

            <nav className="flex flex-col gap-3 px-0.5">
              {adminNavigationGroups.map((group) => (
                <div className="flex flex-col gap-1" key={group.label}>
                  <span className="px-2 pt-2 text-body-2-medium text-muted-foreground/60">
                    {group.label}
                  </span>
                  {group.items.map((item) => (
                    <div
                      className="flex h-8 items-center gap-2 rounded-md px-2"
                      key={item.href}
                    >
                      <Skeleton className="size-4 shrink-0 rounded" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                  ))}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-12 items-stretch border-b border-border/60 bg-background">
          <div className="dashboard-topbar-inner min-w-0 flex-1">
            <div className="flex min-h-9 min-w-0 items-center gap-2">
              <Skeleton className="h-4 w-24 rounded-md lg:hidden" />
              <div className="hidden min-w-0 flex-1 gap-2 md:flex">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 pb-28 lg:pb-0">
          <main className="dashboard-main">
            <div className="dashboard-content">
              <div className="flex min-w-0 flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-7 w-44 rounded-md" />
                  <Skeleton className="h-4 w-80 rounded" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="section-panel flex flex-col gap-4" key={index}>
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

                <section
                  data-padding="none"
                  className="section-panel overflow-hidden"
                >
                  <div className="border-b border-border/70 px-4 py-3 sm:px-5">
                    <Skeleton className="h-5 w-32 rounded-md" />
                  </div>
                  <div className="divide-y divide-border/70">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto]"
                        key={index}
                      >
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-4 w-40 rounded-md" />
                          <Skeleton className="h-3 w-56 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
