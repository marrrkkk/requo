import { BrandMark } from "@/components/shared/brand-mark";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading skeleton for the admin shell.
 *
 * Mirrors the shape of `AdminShell` so the cross-fade on navigation
 * feels calm: branded header, nav placeholder, page header block,
 * and a stack of card placeholders for the page body. The skeleton
 * intentionally does not mount the live sidebar — `loading.tsx`
 * renders before any client provider wires up, so we use plain
 * markup with the same layout metrics instead.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-svh w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark href="/admin" subtitle="Admin" />
        </div>
        <Skeleton className="size-10 rounded-full" />
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPage>
          <div className="space-y-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-11 w-64 rounded-xl" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  className="h-9 w-28 rounded-lg"
                  key={`admin-nav-${index}`}
                />
              ))}
            </div>

            <div className="min-w-0">
              <div className="flex flex-col gap-6 pb-24 sm:gap-7 xl:pb-28">
                <section className="section-panel p-6">
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="h-4 w-full max-w-lg rounded-md" />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div className="info-tile" key={`admin-tile-${index}`}>
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-3 w-24 rounded-md" />
                            <Skeleton className="h-8 w-16 rounded-md" />
                            <Skeleton className="h-3 w-28 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="section-panel overflow-hidden">
                  <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
                    <Skeleton className="h-5 w-36 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                  <div className="divide-y divide-border/70">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                        key={`admin-row-${index}`}
                      >
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-4 w-40 rounded-md" />
                          <Skeleton className="h-3 w-56 rounded-md" />
                        </div>
                        <div className="flex items-center gap-2 lg:justify-end">
                          <Skeleton className="h-6 w-20 rounded-full" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </DashboardPage>
      </main>
    </div>
  );
}
