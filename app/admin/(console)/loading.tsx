import { DashboardPageSkeleton } from "@/components/shell/dashboard-page-skeleton";

/**
 * Content-area loading state for admin routes.
 *
 * The `(console)` layout already renders the persistent chrome (rail + topbar),
 * so this only stands in for the page body during in-console navigations —
 * exactly how the business dashboard does it. The cold-load fallback for the
 * whole shell lives in `AdminShellSkeleton` and is used by the layout itself.
 */
export default function AdminLoading() {
  return <DashboardPageSkeleton />;
}
