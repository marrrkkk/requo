import Link from "next/link";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminDataTable,
  AdminPagination,
  AdminSearchForm,
  formatDateTime,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminDeletionRequestsPage } from "@/features/admin/queries";
import { parseAdminListFilters } from "@/features/admin/schemas";

type AdminDeletionRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDeletionRequestsPage({
  searchParams,
}: AdminDeletionRequestsPageProps) {
  await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const filters = parseAdminListFilters(resolvedSearchParams);
  const page = await getAdminDeletionRequestsPage(filters);

  return (
    <DashboardPage>
      <PageHeader
        description="Inspect scheduled workspace deletion requests and handle safe cancellation or due completion."
        title="Deletion requests"
      />

      <AdminSearchForm
        action="/admin/deletion-requests"
        defaultValue={filters.q}
        description="Only pending scheduled workspace deletions are shown."
        placeholder="Search by workspace, ID, slug, or owner email"
        resultLabel={`${formatNumber(page.pageInfo.totalCount)} requests`}
      />

      <div className="flex flex-col gap-5">
        <AdminDataTable empty={page.items.length === 0}>
          <Table className="min-w-[72rem] table-fixed">
            <TableCaption className="sr-only">
              Pending scheduled workspace deletion requests.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Target</TableHead>
                <TableHead className="w-[9rem]">Type</TableHead>
                <TableHead className="w-[16rem]">Requested by</TableHead>
                <TableHead className="w-[18rem]">Owner</TableHead>
                <TableHead className="w-[12rem]">Scheduled deletion</TableHead>
                <TableHead className="w-[10rem]">Subscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.workspaceId}>
                  <TableCell className="w-[18rem]">
                    <Link
                      className="table-meta-stack max-w-full"
                      href={`/admin/deletion-requests/${item.workspaceId}`}
                      prefetch={true}
                    >
                      <span className="table-link">
                        {item.workspaceName}
                      </span>
                      <span className="table-supporting-text">
                        {item.workspaceSlug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="w-[9rem]">workspace</TableCell>
                  <TableCell className="w-[16rem] text-muted-foreground">
                    {item.requestedByUserId ?? "Not available"}
                  </TableCell>
                  <TableCell className="w-[18rem] table-emphasis">
                    {item.ownerEmail}
                  </TableCell>
                  <TableCell className="w-[12rem] text-muted-foreground">
                    {formatDateTime(item.scheduledDeletionAt)}
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    {item.subscriptionStatus ?? "free"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          pageInfo={page.pageInfo}
          pathname="/admin/deletion-requests"
          searchParams={resolvedSearchParams}
        />
      </div>
    </DashboardPage>
  );
}
