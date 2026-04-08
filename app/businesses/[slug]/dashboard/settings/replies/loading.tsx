import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessSavedRepliesLoading() {
  return (
    <DashboardPage className="dashboard-side-stack">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
        <div className="self-start">
          <div className="rounded-3xl border border-border/75 bg-muted/25 p-5 shadow-none sm:p-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-6 w-36 rounded-lg" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>

            <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-9 w-12 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-border/65 bg-background/85 p-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="mt-2 h-4 w-full rounded-md" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded-md" />
            </div>

            <Skeleton className="mt-5 h-11 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-5">
          <section className="section-panel p-6">
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
              </div>
            </div>
          </section>

          <section className="section-panel p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>

              {Array.from({ length: 2 }).map((_, index) => (
                <div className="rounded-3xl border border-border/75 bg-card/97 p-5" key={index}>
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-40 rounded-md" />
                        <Skeleton className="h-4 w-28 rounded-md" />
                      </div>
                      <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardPage>
  );
}
