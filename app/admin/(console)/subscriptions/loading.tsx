import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Structural loading state for the admin subscriptions page.
 *
 * Renders the toolbar frame and table headers synchronously.
 * Only data rows use `<Skeleton>`.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminSubscriptionsLoading() {
  return (
    <>
      {/* Toolbar / filters skeleton */}
      <div className="toolbar-panel">
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton className="h-4 w-full max-w-sm rounded-md" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="data-list-toolbar-grid">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <DashboardTableContainer>
        <Table className="min-w-[60rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead className="w-[8rem]">Plan</TableHead>
              <TableHead className="w-[9rem]">Status</TableHead>
              <TableHead className="w-[8rem]">Provider</TableHead>
              <TableHead className="w-[10rem]">Period ends</TableHead>
              <TableHead className="w-[10rem]">Canceled at</TableHead>
              <TableHead className="w-[6rem]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`sub-skel-${i}`}>
                <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16 rounded-lg" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
    </>
  );
}
