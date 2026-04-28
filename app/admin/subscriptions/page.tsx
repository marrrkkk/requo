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
import { getAdminSubscriptionsPage } from "@/features/admin/queries";
import { parseAdminListFilters } from "@/features/admin/schemas";

type AdminSubscriptionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: AdminSubscriptionsPageProps) {
  await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const filters = parseAdminListFilters(resolvedSearchParams);
  const page = await getAdminSubscriptionsPage(filters);

  return (
    <DashboardPage>
      <PageHeader
        description="Inspect workspace billing state. Provider billing remains the source of truth."
        eyebrow="Internal admin"
        title="Subscriptions"
      />

      <DashboardSection title="Search subscriptions">
        <AdminSearchForm
          action="/admin/subscriptions"
          defaultValue={filters.q}
          placeholder="Search by workspace, owner, customer ID, or subscription ID"
        />
      </DashboardSection>

      <DashboardSection
        description="Workspace-scoped billing state and usage context."
        title="Subscriptions"
      >
        <AdminDataTable empty={page.items.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Current plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.workspaceId}>
                  <TableCell>
                    <Link
                      className="flex min-w-0 flex-col gap-1 underline-offset-4 hover:underline"
                      href={`/admin/subscriptions/${item.workspaceId}`}
                    >
                      <span className="font-medium text-foreground">
                        {item.workspaceName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.workspaceSlug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{item.ownerEmail}</TableCell>
                  <TableCell>{item.currentPlan}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={item.subscriptionStatus} />
                  </TableCell>
                  <TableCell>{item.billingProvider ?? "None"}</TableCell>
                  <TableCell>{formatDateTime(item.currentPeriodEnd)}</TableCell>
                  <TableCell>
                    {formatNumber(item.businessCount)} businesses /{" "}
                    {formatNumber(item.memberCount)} members
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          hrefForPage={(nextPage) =>
            buildAdminPageHref(
              "/admin/subscriptions",
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
