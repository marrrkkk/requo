import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDashboardLoading() {
  return (
    <div className="home-page-container">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        {/* Greeting + AI chat input */}
        <section className="shrink-0 pb-6">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>

          {/* Chat input placeholder */}
          <div className="mt-3">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </section>

        {/* Needs attention section */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Section header */}
            <div className="flex shrink-0 items-center justify-between pb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Needs attention
              </h2>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>

            {/* Scrollable list placeholder */}
            <div className="flex flex-col gap-1 pt-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="flex items-center gap-3 px-1.5 py-2" key={index}>
                  <Skeleton className="size-1.5 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="ml-auto h-3 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
