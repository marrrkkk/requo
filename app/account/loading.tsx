import { Skeleton } from "@/components/ui/skeleton";

/**
 * Account root loading skeleton.
 *
 * The account root page redirects to /account/profile, so this skeleton
 * mirrors the profile page layout for a seamless transition.
 */
export default function AccountLoading() {
  return (
    <div className="form-stack">
      <div className="rounded-xl border border-border/75 bg-card/97">
        {/* CardHeader */}
        <div className="flex flex-col gap-2.5 px-6 pt-6 pb-6">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>

        {/* CardContent */}
        <div className="px-6 pb-6 pt-0">
          <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-7">
            {/* Avatar panel (left column) */}
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

            {/* Form sections (right column) */}
            <div className="flex min-w-0 flex-col gap-5">
              <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-28 rounded-lg" />
                    <Skeleton className="h-4 w-44 rounded-md" />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <FieldSkeleton />
                    <FieldSkeleton />
                  </div>
                </div>
              </section>

              <section className="soft-panel px-5 py-5 shadow-none sm:px-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-44 rounded-md" />
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <FieldSkeleton />
                    <FieldSkeleton />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
