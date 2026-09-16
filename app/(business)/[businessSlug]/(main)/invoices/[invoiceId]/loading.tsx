import { DashboardPage, DashboardSection } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  DetailSectionFallback,
} from "@/components/shared/detail-section-fallback";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Static shell for the invoice detail route: the same header copy, section
 * order, and layout frames as the page, with a dimensionally accurate
 * skeleton per staged region.
 */
export default function Loading() {
  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Billing"
        title="Invoice"
        description="Loading invoice details."
        actions={<Skeleton className="h-9 w-32" />}
      />
      <div className="flex flex-col gap-6">
        <DashboardSection title="Status">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-20 w-full rounded-lg" key={index} />
            ))}
          </div>
        </DashboardSection>
        <DetailSectionFallback rows={4} />
        <DetailSectionFallback rows={3} />
      </div>
    </DashboardPage>
  );
}
