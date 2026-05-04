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
import { getAdminUsersPage } from "@/features/admin/queries";
import { parseAdminListFilters } from "@/features/admin/schemas";

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const filters = parseAdminListFilters(resolvedSearchParams);
  const page = await getAdminUsersPage(filters);

  return (
    <DashboardPage>
      <PageHeader
        description="Find user accounts by email, name, or user ID and inspect their related workspace access."
        title="Users"
      />

      <AdminSearchForm
        action="/admin/users"
        defaultValue={filters.q}
        description="Search user accounts by email, name, or user ID."
        placeholder="Search by email, name, or user ID"
        resultLabel={`${formatNumber(page.pageInfo.totalCount)} users`}
      />

      <div className="flex flex-col gap-5">
        <AdminDataTable empty={page.items.length === 0}>
          <Table className="min-w-[64rem] table-fixed">
            <TableCaption className="sr-only">
              Newest matching users appear first.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">User</TableHead>
                <TableHead className="w-[10rem]">Created</TableHead>
                <TableHead className="w-[10rem]">Last active</TableHead>
                <TableHead className="w-[8rem]">Workspaces</TableHead>
                <TableHead className="w-[14rem]">Owned plans</TableHead>
                <TableHead className="w-[8rem]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="w-[18rem]">
                    <Link
                      className="table-meta-stack max-w-full"
                      href={`/admin/users/${item.id}`}
                      prefetch={true}
                    >
                      <span className="table-link">{item.name}</span>
                      <span className="table-supporting-text">{item.email}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="w-[10rem] text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell className="w-[10rem] text-muted-foreground">
                    {formatDateTime(item.lastActiveAt)}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    {formatNumber(item.workspaceCount)}
                  </TableCell>
                  <TableCell className="w-[14rem] text-muted-foreground">
                    Free {item.planSummary.free} / Pro {item.planSummary.pro} /
                    Business {item.planSummary.business}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    {item.emailVerified ? "Verified" : "Unverified"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          pageInfo={page.pageInfo}
          pathname="/admin/users"
          searchParams={resolvedSearchParams}
        />
      </div>
    </DashboardPage>
  );
}
