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
import { AdminAuditListPageShell } from "@/features/admin/components/system/admin-audit-list-sections";

/**
 * Structural loading state for the admin audit logs page.
 *
 * Mirrors the page shell (header via `AdminAuditListPageShell` + results
 * card): filter strip header inside the results card, then table headers
 * synchronously. Only data rows use `<Skeleton>`.
 */
export default function AdminAuditLogsLoading() {
  return (
    <AdminAuditListPageShell>
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />

        <div className="overflow-x-auto no-scrollbar">
          <Table className="min-w-[70rem] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12rem]">When</TableHead>
                <TableHead className="w-[14rem]">Admin</TableHead>
                <TableHead className="w-[14rem]">Action</TableHead>
                <TableHead className="w-[16rem]">Target</TableHead>
                <TableHead className="w-[14rem]">Metadata</TableHead>
                <TableHead className="w-[12rem]">Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`audit-skel-${i}`}>
                  <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminAuditListPageShell>
  );
}
