import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminSystemLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="Live integration checks and environment configuration."
        eyebrow="Admin"
        title="System"
      />
      <div className="flex flex-col gap-8">
        <div
          aria-busy
          className="section-panel flex flex-col gap-5 border-l-4 border-l-border p-5 sm:p-6"
        >
          <div className="flex gap-4">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-6 w-56 rounded-md" />
              <Skeleton className="h-4 w-full max-w-lg rounded-md" />
              <div className="flex flex-wrap gap-4 pt-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton className="h-4 w-20 rounded-md" key={index} />
                ))}
              </div>
            </div>
            <Skeleton className="hidden h-7 w-28 rounded-full sm:block" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton className="h-14 rounded-lg" key={index} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40 rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-36 rounded-lg" key={index} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32 rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton className="h-28 rounded-lg" key={index} />
            ))}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
