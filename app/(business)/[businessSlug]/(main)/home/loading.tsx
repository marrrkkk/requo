import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDashboardLoading() {
  return (
    <div className="home-page-container home-entrance">
      {/* Greeting */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 rounded-lg sm:w-64" />
          <Skeleton className="h-4 w-72 rounded-md sm:w-80" />
        </div>
      </section>

      {/* Next step hint */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-4">
        <Skeleton className="h-12 w-full max-w-md rounded-xl" />
      </section>

      {/* Velocity stats */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              className="rounded-xl border border-border/40 bg-card/30 px-4 py-3"
              key={i}
            >
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="mt-2 h-6 w-10 rounded-md" />
              <Skeleton className="mt-1.5 h-2.5 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* Priority queue */}
      <section className="home-entrance-section w-full max-w-5xl mx-auto mt-8 pb-24">
        <div className="flex items-center justify-between pb-3">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="flex flex-col gap-0.5 pt-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="flex items-center gap-3.5 rounded-lg px-2 py-2.5"
              key={index}
            >
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40 rounded-md" />
                <Skeleton className="h-3 w-52 rounded-md" />
              </div>
              <Skeleton className="hidden h-3 w-20 rounded-md sm:block" />
            </div>
          ))}
        </div>
      </section>

      {/* Floating chat input placeholder */}
      <div className="fixed bottom-5 left-0 right-0 z-40 pointer-events-none lg:left-[17.5rem]">
        <div className="flex flex-col items-center px-4">
          <Skeleton className="h-[44px] w-full max-w-lg rounded-full" />
        </div>
      </div>
    </div>
  );
}
