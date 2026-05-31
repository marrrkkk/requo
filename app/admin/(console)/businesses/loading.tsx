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
 * Structural loading state for the admin businesses page.
 *
 * Renders the toolbar frame and table headers synchronously.
 * Only data rows use `<Skeleton>`.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminBusinessesLoading() {
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
      </DashboardTableContainer>
    </>
  );
}
