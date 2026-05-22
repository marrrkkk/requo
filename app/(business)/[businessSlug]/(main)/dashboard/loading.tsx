import {
  DashboardActionsRow,
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDashboardLoading() {
  return (
    <DashboardPage className="gap-5 xl:gap-6">
      {/* Checklist placeholder */}
      <section className="section-panel overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-56 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </section>

      {/* Needs attention placeholder */}
      <section className="section-panel overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="info-tile" key={`attention-${index}`}>
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-7 w-12 rounded-md" />
                <Skeleton className="mt-2 h-3 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business header + stats section */}
      <section className="section-panel overflow-hidden">
        <div className="flex flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-11 w-full max-w-sm rounded-2xl" />
            </div>

            <DashboardActionsRow className="w-full [&>*]:w-full sm:[&>*]:w-auto lg:w-auto lg:justify-end">
              <Skeleton className="h-11 rounded-xl sm:w-36" />
              <Skeleton className="h-11 rounded-xl sm:w-32" />
            </DashboardActionsRow>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="info-tile" key={`stat-${index}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 flex-col gap-3">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                  <Skeleton className="size-10 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Queues grid */}
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section className="section-panel overflow-hidden" key={`queue-${index}`}>
            <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
              <Skeleton className="h-6 w-32 rounded-md" />
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
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Follow-ups section */}
      <section className="section-panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="divide-y divide-border/70">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              key={`followup-${index}`}
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
    </DashboardPage>
  );
}
