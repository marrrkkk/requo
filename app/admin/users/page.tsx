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
  buildAdminPageHref,
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
        eyebrow="Internal admin"
        title="Users"
      />

      <DashboardSection title="Search users">
        <AdminSearchForm
          action="/admin/users"
          defaultValue={filters.q}
          placeholder="Search by email, name, or user ID"
        />
      </DashboardSection>

      <DashboardSection
        description="Newest matching users first."
        title="User accounts"
      >
        <AdminDataTable empty={page.items.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Owned plans</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      className="flex min-w-0 flex-col gap-1 underline-offset-4 hover:underline"
                      href={`/admin/users/${item.id}`}
                    >
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.email}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>{formatDateTime(item.lastActiveAt)}</TableCell>
                  <TableCell>{formatNumber(item.workspaceCount)}</TableCell>
                  <TableCell>
                    Free {item.planSummary.free} / Pro {item.planSummary.pro} /
                    Business {item.planSummary.business}
                  </TableCell>
                  <TableCell>
                    {item.emailVerified ? "Verified" : "Unverified"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          hrefForPage={(nextPage) =>
            buildAdminPageHref("/admin/users", resolvedSearchParams, nextPage)
          }
          pageInfo={page.pageInfo}
        />
      </DashboardSection>
    </DashboardPage>
  );
}
