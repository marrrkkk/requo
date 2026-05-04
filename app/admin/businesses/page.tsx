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
import { getAdminBusinessesPage } from "@/features/admin/queries";
import { parseAdminListFilters } from "@/features/admin/schemas";

type AdminBusinessesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBusinessesPage({
  searchParams,
}: AdminBusinessesPageProps) {
  await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const filters = parseAdminListFilters(resolvedSearchParams);
  const page = await getAdminBusinessesPage(filters);

  return (
    <DashboardPage>
      <PageHeader
        description="Search businesses by business name, business ID, workspace, slug, or owner email."
        title="Businesses"
      />

      <AdminSearchForm
        action="/admin/businesses"
        defaultValue={filters.q}
        description="Search businesses by business name, business ID, workspace, slug, or owner email."
        placeholder="Search by business, ID, workspace, or owner"
        resultLabel={`${formatNumber(page.pageInfo.totalCount)} businesses`}
      />

      <div className="flex flex-col gap-5">
        <AdminDataTable empty={page.items.length === 0}>
          <Table className="min-w-[82rem] table-fixed">
            <TableCaption className="sr-only">
              Newest matching businesses appear first.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Business</TableHead>
                <TableHead className="w-[16rem]">Workspace</TableHead>
                <TableHead className="w-[18rem]">Owner</TableHead>
                <TableHead className="w-[8rem]">Inquiries</TableHead>
                <TableHead className="w-[8rem]">Quotes</TableHead>
                <TableHead className="w-[8rem]">Follow-ups</TableHead>
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
                      href={`/admin/businesses/${item.id}`}
                      prefetch={true}
                    >
                      <span className="table-link">{item.name}</span>
                      <span className="table-supporting-text">{item.slug}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="w-[16rem]">
                    <Link
                      className="table-emphasis block max-w-full hover:text-primary hover:underline"
                      href={`/admin/workspaces/${item.workspaceId}`}
                      prefetch={true}
                    >
                      {item.workspaceName}
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
                  <TableCell className="w-[8rem]">
                    {formatNumber(item.inquiryCount)}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    {formatNumber(item.quoteCount)}
                  </TableCell>
                  <TableCell className="w-[8rem]">
                    {formatNumber(item.followUpCount)}
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
          pathname="/admin/businesses"
          searchParams={resolvedSearchParams}
        />
      </div>
    </DashboardPage>
  );
}
