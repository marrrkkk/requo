import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceSettingsBillingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Plan & billing
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage your workspace subscription, payment method, and billing lifecycle separately from business operations.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-border/75 bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-64 rounded-md" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-6 border-t border-border/40 pt-6">
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>

        <div className="rounded-xl border border-border/75 bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
