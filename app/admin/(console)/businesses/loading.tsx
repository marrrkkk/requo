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
 * Structural loading state for the admin businesses page.
 *
 * Mirrors the page composition: filter strip header inside the results
 * card, then table headers synchronously. Only data rows use `<Skeleton>`.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminBusinessesLoading() {
  return (
    <div className="dashboard-table-shell" data-list-card>
      <AdminListControlsFallback />

      <div className="hidden overflow-x-auto no-scrollbar xl:block">
        <Table className="min-w-[60rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18rem]">Business</TableHead>
              <TableHead className="w-[16rem]">Owner</TableHead>
              <TableHead className="w-[8rem]">Plan</TableHead>
              <TableHead className="w-[8rem] text-right">Members</TableHead>
              <TableHead className="w-[10rem]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`biz-skel-${i}`}>
                <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-36 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8 rounded-md" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
