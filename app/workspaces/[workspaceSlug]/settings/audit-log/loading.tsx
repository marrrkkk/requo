import { PageHeader } from "@/components/shared/page-header";
import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceAuditLogLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Track meaningful billing, lifecycle, member, and security events across the workspace."
        eyebrow="Audit log"
        title="Workspace audit log"
        actions={<Skeleton className="h-10 w-32 rounded-md" />}
      />

      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Skeleton className="h-10 w-full sm:w-48 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-48 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-48 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
      </div>

      <DashboardSection
        description="Newest events first. This log records meaningful admin, lifecycle, billing, and security actions."
        title="Workspace audit log"
      >
        <div className="rounded-xl border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
          <div className="divide-y divide-border/70">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4">
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-4 w-56 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}
