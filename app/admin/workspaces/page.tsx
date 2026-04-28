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
        eyebrow="Internal admin"
        title="Workspaces"
      />

      <DashboardSection title="Search workspaces">
        <AdminSearchForm
          action="/admin/workspaces"
          defaultValue={filters.q}
          placeholder="Search by workspace, slug, ID, or owner email"
        />
      </DashboardSection>

      <DashboardSection
        description="Newest matching workspaces first."
        title="Workspaces"
      >
        <AdminDataTable empty={page.items.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Businesses</TableHead>
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
                      href={`/admin/workspaces/${item.id}`}
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
                      href={`/admin/users/${item.ownerUserId}`}
                    >
                      {item.ownerEmail}
                    </Link>
                  </TableCell>
                  <TableCell>{item.plan}</TableCell>
                  <TableCell>{item.subscriptionStatus ?? "free"}</TableCell>
                  <TableCell>{formatNumber(item.memberCount)}</TableCell>
                  <TableCell>{formatNumber(item.businessCount)}</TableCell>
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
              "/admin/workspaces",
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
