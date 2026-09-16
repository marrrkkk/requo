import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
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
 * Mirrors the page shell (header + results card): filter strip header
 * inside the results card, then table headers synchronously. Only data
 * rows use `<Skeleton>`. Column order, widths, and alignment match
 * `AdminBusinessesTable` so the shell and the resolved page agree with
 * no layout shift.
 */
export default function AdminBusinessesLoading() {
  return (
    <DashboardPage>
      <PageHeader title="Businesses" />
      <div className="dashboard-table-shell" data-list-card>
        <AdminListControlsFallback />

        <div className="hidden overflow-x-auto no-scrollbar xl:block">
          <Table className="min-w-[60rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20rem]">Business</TableHead>
                <TableHead className="w-[9rem]">Plan</TableHead>
                <TableHead className="w-[14rem]">Owner</TableHead>
                <TableHead className="w-[6rem]">Members</TableHead>
                <TableHead className="w-[8rem]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`biz-skel-${i}`}>
                  <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardPage>
  );
}
