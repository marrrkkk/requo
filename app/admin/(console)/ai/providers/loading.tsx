import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAiProvidersLoading() {
  return (
    <DashboardPage>
      <PageHeader
        description="Configured providers, routing, and live capacity."
        eyebrow="Admin"
        title="AI providers"
      />
      <div className="flex flex-col gap-6">
        <div className="section-panel space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton className="h-16 w-full rounded-lg" key={index} />
            ))}
          </div>
        </div>
        <div className="section-panel space-y-4">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </DashboardPage>
  );
}
