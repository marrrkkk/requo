import { DashboardTableContainer } from "@/components/shared/dashboard-layout";
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

export default function BusinessFormsLoading() {
  return (
    <>
      <PageHeader
        title="Forms"
        description="Manage inquiry capture, public URLs, and starting intake defaults."
      />

      {/* Mobile skeleton */}
      <div className="flex flex-col gap-2 sm:hidden" style={{ minHeight: 240 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background px-4 py-3.5"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36 max-w-full rounded-md" />
              <Skeleton className="h-3 w-28 max-w-full rounded-md" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <DashboardTableContainer className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Inquiries</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-4 w-8 rounded-md" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
    </>
  );
}
