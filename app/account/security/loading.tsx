import { Skeleton } from "@/components/ui/skeleton";

export default function AccountSecurityLoading() {
  return (
    <div className="dashboard-side-stack">
      <section className="section-panel p-6">
        <div className="space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-4 w-52 rounded-md" />
          </div>

          <div className="grid gap-5">
            <FieldSkeleton />
            <div className="grid gap-5 lg:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </section>

      <section className="section-panel p-6">
        <div className="space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-4 w-44 rounded-md" />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="mt-2 h-4 w-56 rounded-md" />
          </div>

          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </section>

      <section className="section-panel border-destructive/25 p-6">
        <div className="space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="mt-2 h-4 w-full rounded-md" />
            <Skeleton className="mt-2 h-4 w-5/6 rounded-md" />
          </div>

          <div className="grid gap-5">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-28 rounded-md" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
