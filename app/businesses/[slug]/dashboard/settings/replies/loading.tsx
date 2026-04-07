import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessSavedRepliesLoading() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>

      {Array.from({ length: 2 }).map((_, index) => (
        <section className="section-panel p-6" key={index}>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-6 w-40 rounded-md" />
            <div className="grid gap-4">
              {index === 0 ? (
                <>
                  <div className="grid gap-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                  <div className="grid gap-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
                </>
              ) : (
                Array.from({ length: 3 }).map((__, cardIndex) => (
                  <div className="soft-panel p-4 shadow-none" key={cardIndex}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40 rounded-md" />
                          <Skeleton className="h-4 w-56 rounded-md" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-9 w-20 rounded-lg" />
                          <Skeleton className="h-9 w-20 rounded-lg" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ))}
    </DashboardPage>
  );
}
