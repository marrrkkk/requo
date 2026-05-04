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
  AdminStatusBadge,
  formatDateTime,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminWorkspacesPage } from "@/features/admin/queries";
import { parseAdminListFilters } from "@/features/admin/schemas";

type AdminWorkspacesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminWorkspacesPage({
  searchParams,
}: AdminWorkspacesPageProps) {
  await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const filters = parseAdminListFilters(resolvedSearchParams);
  const page = await getAdminWorkspacesPage(filters);

  return (
    <DashboardPage>
      <PageHeader
        description="Search workspaces by name, slug, workspace ID, or owner email."
        title="Workspaces"
      />

      <AdminSearchForm
        action="/admin/workspaces"
        defaultValue={filters.q}
        description="Search workspaces by name, slug, workspace ID, or owner email."
        placeholder="Search by workspace, slug, ID, or owner email"
        resultLabel={`${formatNumber(page.pageInfo.totalCount)} workspaces`}
      />

      <div className="flex flex-col gap-5">
        <AdminDataTable empty={page.items.length === 0}>
          <Table className="min-w-[78rem] table-fixed">
            <TableCaption className="sr-only">
              Newest matching workspaces appear first.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Workspace</TableHead>
                <TableHead className="w-[18rem]">Owner</TableHead>
                <TableHead className="w-[8rem]">Plan</TableHead>
                <TableHead className="w-[10rem]">Subscription</TableHead>
                <TableHead className="w-[8rem]">Members</TableHead>
                <TableHead className="w-[8rem]">Businesses</TableHead>
                <TableHead className="w-[10rem]">Status</TableHead>
                <TableHead className="w-[10rem]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="w-[18rem]">
                    <Link
                      className="table-meta-stack max-w-full"
                      href={`/admin/workspaces/${item.id}`}
                      prefetch={true}
                    >
                      <span className="table-link">{item.name}</span>
                      <span className="table-supporting-text">{item.slug}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="w-[18rem]">
                    <Link
                      className="table-emphasis block max-w-full hover:text-primary hover:underline"
                      href={`/admin/users/${item.ownerUserId}`}
                      prefetch={true}
                    >
                      {item.ownerEmail}
                    </Link>
                  </TableCell>
                  <TableCell className="w-[8rem] capitalize">
                    {item.plan}
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    {item.subscriptionStatus ?? "free"}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    {formatNumber(item.memberCount)}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    {formatNumber(item.businessCount)}
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    <AdminStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="w-[10rem] text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          pageInfo={page.pageInfo}
          pathname="/admin/workspaces"
          searchParams={resolvedSearchParams}
        />
      </div>
    </DashboardPage>
  );
}
