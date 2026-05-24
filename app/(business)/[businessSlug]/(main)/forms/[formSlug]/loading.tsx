import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessFormLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title={<Skeleton className="h-9 w-48 rounded-xl" />}
        description="Edit the fields, public page, preview, and publishing controls for this inquiry workflow."
      />

      <div className="flex flex-col gap-5">
        {/* Tab bar + action button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden sm:inline-flex items-center gap-1">
            <Skeleton className="h-9 w-[4.5rem] rounded-md" />
            <Skeleton className="h-9 w-[4.25rem] rounded-md" />
            <Skeleton className="h-9 w-[6.25rem] rounded-md" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg sm:ml-auto sm:w-[7.5rem]" />
        </div>

        {/* Tab content area — matches fields editor structure */}
        <div className="dashboard-side-stack min-w-0">
          {/* Preset section placeholder */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-lg" />
              <Skeleton className="h-4 w-full max-w-xl rounded-md" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/15 p-4"
                  key={index}
                >
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-3 w-full rounded-md" />
                </div>
              ))}
            </div>
          </section>

          {/* Form fields section placeholder */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="soft-panel flex flex-col gap-5 px-4 py-4 shadow-none" key={index}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28 rounded-md" />
                      <Skeleton className="h-4 w-24 rounded-md" />
                    </div>
                    <Skeleton className="size-8 rounded-full" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-3">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-12 rounded-xl" />
                    </div>
                    <div className="grid gap-3">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-12 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
