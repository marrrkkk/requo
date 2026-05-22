import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="Invoices"
        description="Generate, send, and track payment for completed work."
      />

      {/* Mobile skeleton: card list */}
      <div className="flex flex-col gap-2 sm:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40 max-w-full rounded-md" />
              <Skeleton className="h-3 w-32 max-w-full rounded-md" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton: table */}
      <div className="hidden sm:block">
        <div className="dashboard-table-shell">
          <div className="dashboard-table-shell-inner">
            {/* Table header */}
            <div className="flex items-center gap-4 border-b border-border/70 px-4 py-3">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="ml-auto h-3 w-16 rounded-md" />
              <Skeleton className="hidden h-3 w-16 rounded-md lg:block" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border/40 px-4 py-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="hidden h-4 w-20 rounded-md lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
