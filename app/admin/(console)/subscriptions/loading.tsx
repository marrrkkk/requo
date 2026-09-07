import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminListControlsFallback } from "@/features/admin/components/list/admin-list-controls-fallback";

/**
 * Structural loading state for the admin subscriptions page.
 *
 * Mirrors the page composition: filter strip header inside the results
 * card, then table headers synchronously. Only data rows use `<Skeleton>`.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminSubscriptionsLoading() {
  return (
    <div className="dashboard-table-shell" data-list-card>
      <AdminListControlsFallback />

      <div className="overflow-x-auto no-scrollbar">
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
                <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
