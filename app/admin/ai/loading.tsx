import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAiLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="Model usage, cost, and reliability at a glance."
        title="AI overview"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-[132px] rounded-xl" key={index} />
        ))}
      </div>
      <div className="section-panel space-y-4">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </DashboardPage>
  );
}
