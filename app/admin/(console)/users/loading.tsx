import { DashboardSection, DashboardTableContainer } from "@/components/shared/dashboard-layout";
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
 * Structural loading state for the admin users page.
 *
 * Renders the toolbar frame, section title, and table headers
 * synchronously. Only data rows use `<Skeleton>`.
 *
 * Requirements: 2.1, 2.2, 8.3, 9.1, 9.2
 */
export default function AdminUsersLoading() {
  return (
    <>
      {/* Toolbar skeleton — structural frame, skeleton for search counts */}
      <div className="toolbar-panel">
        <div className="flex flex-col gap-4">
          <div className="data-list-toolbar-summary">
            <Skeleton className="h-4 w-full max-w-sm rounded-md" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="data-list-toolbar-grid">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <DashboardSection
        description="Newest sign-ups first. Click any row to open the detail page."
        title="Users"
      >
        <DashboardTableContainer>
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
        </DashboardTableContainer>
      </DashboardSection>
    </>
  );
}
