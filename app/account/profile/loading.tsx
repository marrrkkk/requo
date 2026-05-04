import { Skeleton } from "@/components/ui/skeleton";

export default function AccountProfileLoading() {
  return (
    <div className="dashboard-side-stack">
      <section className="section-panel p-6">
        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
          <div className="self-start">
            <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-6 w-36 rounded-lg" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>

              <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Skeleton className="size-24 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="mx-auto h-5 w-32 rounded-md" />
                    <Skeleton className="mx-auto h-4 w-24 rounded-md" />
                    <Skeleton className="mx-auto h-4 w-40 rounded-md" />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/70 pt-5">
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-36 rounded-lg" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            </section>

            <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-12 rounded-md" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-10 rounded-md" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Skeleton className="h-12 w-full rounded-xl sm:w-40" />
      </div>
    </div>
  );
}
