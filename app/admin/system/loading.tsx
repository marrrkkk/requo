import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSystemLoading() {
  return (
    <DashboardPage>
      <PageHeader
        title="System"
        description="Operational checks without exposing secrets or raw environment values."
      />

      <DashboardSection title="Application">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="rounded-lg border border-border/70 bg-background/50 p-4"
              key={index}
            >
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="mt-2.5 h-4 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="Provider configuration">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              className="flex items-center justify-between gap-4"
              key={index}
            >
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        {["Recent failed payments", "Recent unprocessed webhooks"].map(
          (title) => (
            <DashboardSection key={title} title={title}>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    className="flex items-center justify-between gap-4"
                    key={index}
                  >
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </DashboardSection>
          ),
        )}
      </div>
    </DashboardPage>
  );
}
