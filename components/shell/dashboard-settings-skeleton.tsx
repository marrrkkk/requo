import {
  DashboardPage,
} from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSettingsSkeleton() {
  return (
    <DashboardPage>
      <section className="section-panel overflow-hidden">
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="soft-panel px-4 py-4" key={index}>
              <div className="flex items-start gap-3">
                <Skeleton className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="mt-2 h-4 w-full rounded-md" />
                  <Skeleton className="mt-2 h-4 w-5/6 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
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
    </DashboardPage>
  );
}
