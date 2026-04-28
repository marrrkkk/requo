import Link from "next/link";

import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
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
  buildAdminPageHref,
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
        eyebrow="Internal admin"
        title="Businesses"
      />

      <DashboardSection title="Search businesses">
        <AdminSearchForm
          action="/admin/businesses"
          defaultValue={filters.q}
          placeholder="Search by business, ID, workspace, or owner"
        />
      </DashboardSection>

      <DashboardSection
        description="Newest matching businesses first."
        title="Businesses"
      >
        <AdminDataTable empty={page.items.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Inquiries</TableHead>
                <TableHead>Quotes</TableHead>
                <TableHead>Follow-ups</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      className="flex min-w-0 flex-col gap-1 underline-offset-4 hover:underline"
                      href={`/admin/businesses/${item.id}`}
                    >
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.slug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="underline-offset-4 hover:underline"
                      href={`/admin/workspaces/${item.workspaceId}`}
                    >
                      {item.workspaceName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      className="underline-offset-4 hover:underline"
                      href={`/admin/users/${item.ownerUserId}`}
                    >
                      {item.ownerEmail}
                    </Link>
                  </TableCell>
                  <TableCell>{formatNumber(item.inquiryCount)}</TableCell>
                  <TableCell>{formatNumber(item.quoteCount)}</TableCell>
                  <TableCell>{formatNumber(item.followUpCount)}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          hrefForPage={(nextPage) =>
            buildAdminPageHref(
              "/admin/businesses",
              resolvedSearchParams,
              nextPage,
            )
          }
          pageInfo={page.pageInfo}
        />
      </DashboardSection>
    </DashboardPage>
  );
}
