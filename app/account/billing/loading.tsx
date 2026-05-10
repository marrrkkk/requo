import { Skeleton } from "@/components/ui/skeleton";

export default function AccountBillingLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-col gap-10">
        <section className="section-panel p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-10 w-44 rounded-xl" />
              <Skeleton className="h-4 w-full max-w-sm rounded-md" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-8 w-40 rounded-lg" />
              <Skeleton className="h-4 w-full max-w-sm rounded-md" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-6 w-36 rounded-md" />
          <div className="overflow-hidden rounded-2xl border border-border/70">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="grid gap-3 border-b border-border/70 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_8rem_7rem]"
                key={index}
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
