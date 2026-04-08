import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessNotificationSettingsLoading() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-11 w-full max-w-sm rounded-2xl" />
        <Skeleton className="h-4 w-44 rounded-md" />
      </div>

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <section className="section-panel p-6" key={sectionIndex}>
          <div className="flex flex-col gap-5">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
              {Array.from({ length: sectionIndex === 0 ? 2 : 3 }).map((__, rowIndex) => (
                <div
                  className="grid gap-4 border-b border-border/70 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                  key={rowIndex}
                >
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-4 w-full max-w-md rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </DashboardPage>
  );
}
