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
        eyebrow="Internal admin"
        title="Deletion requests"
      />

      <DashboardSection title="Search deletion requests">
        <AdminSearchForm
          action="/admin/deletion-requests"
          defaultValue={filters.q}
          placeholder="Search by workspace, ID, slug, or owner email"
        />
      </DashboardSection>

      <DashboardSection
        description="Only pending scheduled workspace deletions are shown."
        title="Pending requests"
      >
        <AdminDataTable empty={page.items.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Scheduled deletion</TableHead>
                <TableHead>Subscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.workspaceId}>
                  <TableCell>
                    <Link
                      className="flex min-w-0 flex-col gap-1 underline-offset-4 hover:underline"
                      href={`/admin/deletion-requests/${item.workspaceId}`}
                    >
                      <span className="font-medium text-foreground">
                        {item.workspaceName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.workspaceSlug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>workspace</TableCell>
                  <TableCell>{item.requestedByUserId ?? "Not available"}</TableCell>
                  <TableCell>{item.ownerEmail}</TableCell>
                  <TableCell>
                    {formatDateTime(item.scheduledDeletionAt)}
                  </TableCell>
                  <TableCell>{item.subscriptionStatus ?? "free"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          hrefForPage={(nextPage) =>
            buildAdminPageHref(
              "/admin/deletion-requests",
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
