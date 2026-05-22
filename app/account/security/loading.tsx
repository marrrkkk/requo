import { Skeleton } from "@/components/ui/skeleton";

/**
 * Security settings loading skeleton.
 *
 * Mirrors the SecuritySettingsForm layout: a centered max-w-3xl container
 * with three section-panel cards (password, sessions, delete account).
 */
export default function AccountSecurityLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5">
      {/* Password section */}
      <section className="section-panel p-6">
        <div className="flex flex-col gap-5">
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
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-64 rounded-md" />
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

      {/* Session security section */}
      <section className="section-panel p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-4 w-52 rounded-md" />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
            <Skeleton className="h-4 w-44 rounded-md" />
            <Skeleton className="mt-2 h-4 w-72 rounded-md" />
          </div>

          {/* Session list */}
          <div className="rounded-2xl border border-border/70">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                className="flex items-start gap-3 border-b border-border/60 px-4 py-4 last:border-b-0"
                key={index}
              >
                <Skeleton className="size-5 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-3 w-32 rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-10 w-44 rounded-xl" />
          </div>
        </div>
      </section>

      {/* Delete account section */}
      <section className="section-panel border-destructive/25 p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="mt-2 h-4 w-full rounded-md" />
            <Skeleton className="mt-2 h-4 w-5/6 rounded-md" />
          </div>

          <div className="grid gap-5">
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
    <div className="grid gap-3">
      <Skeleton className="h-4 w-28 rounded-md" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
