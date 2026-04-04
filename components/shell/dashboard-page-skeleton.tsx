import {
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton() {
  return (
    <DashboardPage className="gap-5 xl:gap-6">
      <section className="section-panel overflow-hidden">
        <div className="flex flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-32 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-11 w-full max-w-sm rounded-2xl" />
            </div>

            <div className="dashboard-actions w-full [&>*]:w-full sm:[&>*]:w-auto lg:w-auto lg:justify-end">
              <Skeleton className="h-11 rounded-xl sm:w-40" />
              <Skeleton className="h-11 rounded-xl sm:w-36" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="info-tile" key={index}>
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

      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <section className="section-panel overflow-hidden" key={index}>
            <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-32 rounded-md" />
              </div>
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <div className="divide-y divide-border/70">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  key={rowIndex}
                >
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-44 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="section-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="divide-y divide-border/70">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                key={index}
              >
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
                <div className="flex items-center gap-2 lg:justify-end">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-panel p-5">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-28 rounded-md" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="info-tile shadow-none" key={index}>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-5 w-full rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </section>
      </div>
    </DashboardPage>
  );
}
