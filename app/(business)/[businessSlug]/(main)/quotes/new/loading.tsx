import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessDashboardNewQuoteLoading() {
  return (
    <DashboardPage>
      <PageHeader
        eyebrow="New quote"
        title="Create a new quote"
      />
      <div className="flex flex-col gap-6">
        <div className="section-panel animate-pulse">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-6 w-32 rounded-md" />
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <FieldSkeleton />
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}

function FieldSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}