import { Skeleton } from "@/components/ui/skeleton";

/**
 * Account route loading skeleton.
 *
 * Renders inside the already-resolved account layout shell (header, nav)
 * as the Suspense fallback for the page content slot. Mirrors the general
 * shape of account sub-pages (page header + form card sections) to prevent
 * cumulative layout shift during navigation between account routes.
 */
export default function AccountLoading() {
  return (
    <div className="dashboard-side-stack">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-11 w-full max-w-sm rounded-2xl" />
        <Skeleton className="h-4 w-56 rounded-md" />
      </div>

      <section className="section-panel p-6">
        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
          <div className="rounded-3xl border border-border/75 bg-muted/25 p-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-6 w-36 rounded-lg" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-5">
              <div className="flex flex-col items-center gap-4 text-center">
                <Skeleton className="size-24 rounded-full" />
                <div className="w-full space-y-2">
                  <Skeleton className="mx-auto h-5 w-32 rounded-md" />
                  <Skeleton className="mx-auto h-4 w-24 rounded-md" />
                  <Skeleton className="mx-auto h-4 w-40 rounded-md" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>
              <div className="mt-5 space-y-5">
                <div className="grid gap-3">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-12 rounded-xl" />
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="grid gap-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                  <div className="grid gap-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/75 bg-muted/20 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>
              <div className="mt-5">
                <div className="grid gap-3">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-36 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Skeleton className="h-12 w-full rounded-xl sm:w-40" />
      </div>
    </div>
  );
}
