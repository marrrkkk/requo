import {
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSettingsSkeleton() {
  return (
    <DashboardPage>
      <div className="dashboard-side-stack">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
        </div>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-4 w-72 rounded-md" />
            </div>

            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="space-y-4" key={index}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                  </div>
                  <Skeleton className="h-28 rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-panel overflow-hidden">
          <div className="divide-y divide-border/70">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="flex items-start gap-4 px-5 py-5 sm:px-6" key={index}>
                <Skeleton className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-4 w-52 rounded-md" />
                </div>
                <Skeleton className="mt-1 h-4 w-4 rounded-sm" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardPage>
  );
}
