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
 * Structural loading state for the admin users page.
 *
 * Mirrors the page composition: filter strip header inside the results
 * card, then table headers synchronously. Only data rows use `<Skeleton>`.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminUsersLoading() {
  return (
    <div className="dashboard-table-shell" data-list-card>
      <AdminListControlsFallback />

      <div className="hidden overflow-x-auto no-scrollbar xl:block">
        <Table className="min-w-[60rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18rem]">Email</TableHead>
              <TableHead className="w-[14rem]">Name</TableHead>
              <TableHead className="w-[8rem]">Email verified</TableHead>
              <TableHead className="w-[8rem]">Suspended</TableHead>
              <TableHead className="w-[8rem]">Created</TableHead>
              <TableHead className="w-[10rem]">Last session</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`user-skel-${i}`}>
                <TableCell><Skeleton className="h-4 w-44 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
