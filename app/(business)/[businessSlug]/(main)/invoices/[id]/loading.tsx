import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvoiceDetailLoading() {
  return (
    <DashboardPage>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        {/* Mobile action bar */}
        <div className="flex flex-wrap gap-2 xl:hidden">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
        </div>

        {/* Invoice document skeleton */}
        <div className="min-w-0 rounded-2xl border bg-background shadow-sm">
          {/* Status */}
          <div className="px-5 pt-6 sm:px-8">
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>

          {/* Business + Invoice number */}
          <div className="px-5 pt-5 pb-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <Skeleton className="h-7 w-28 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-1 gap-4 border-t border-dashed px-5 py-5 sm:grid-cols-2 sm:px-8">
            <div className="space-y-2">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3.5 w-40 rounded-md" />
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>

          {/* Line items — mobile */}
          <div className="border-t sm:hidden">
            <div className="bg-muted/40 px-5 py-3">
              <Skeleton className="h-3 w-10 rounded-md" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-3 border-t border-border/40 px-5 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-40 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0 rounded-md" />
              </div>
            ))}
          </div>

          {/* Line items — desktop */}
          <div className="hidden border-t sm:block">
            <div className="flex bg-muted/40 px-8 py-3.5">
              <Skeleton className="h-3 w-10 flex-1 rounded-md" />
              <Skeleton className="h-3 w-8 rounded-md" />
              <Skeleton className="ml-6 h-3 w-10 rounded-md" />
              <Skeleton className="ml-6 h-3 w-10 rounded-md" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center border-b border-border/40 px-8 py-5 last:border-0">
                <Skeleton className="h-4 w-40 flex-1 rounded-md" />
                <Skeleton className="h-4 w-6 rounded-md" />
                <Skeleton className="ml-6 h-4 w-16 rounded-md" />
                <Skeleton className="ml-6 h-4 w-20 rounded-md" />
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t bg-muted/20 px-5 py-6 sm:px-8">
            <div className="ml-auto flex w-full max-w-[260px] flex-col gap-2.5">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-14 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-14 rounded-md" />
                <Skeleton className="h-3.5 w-12 rounded-md" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-8 rounded-md" />
                <Skeleton className="h-3.5 w-12 rounded-md" />
              </div>
              <div className="mt-1 flex justify-between border-t border-foreground/10 pt-3">
                <Skeleton className="h-5 w-12 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar skeleton (desktop only) */}
        <div className="hidden flex-col gap-4 xl:flex">
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <Skeleton className="h-3 w-14 rounded-md" />
            <div className="mt-3 flex flex-col gap-2.5">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <Skeleton className="h-3 w-12 rounded-md" />
            <div className="mt-3 flex flex-col gap-2.5">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
