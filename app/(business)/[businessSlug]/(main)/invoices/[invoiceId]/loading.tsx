import { DashboardDetailPageSkeleton } from "@/components/shell/dashboard-detail-page-skeleton";

/**
 * Static shell for the invoice detail route: mirrors the resolved page
 * (detail header + workflow steps + two-column layout) so the shell and the
 * streamed page agree.
 */
export default function Loading() {
  return <DashboardDetailPageSkeleton variant="invoice" />;
}
