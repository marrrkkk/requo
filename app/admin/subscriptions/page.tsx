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
        title="Subscriptions"
      />

      <AdminSearchForm
        action="/admin/subscriptions"
        defaultValue={filters.q}
        description="Search workspace billing state by workspace, owner, customer ID, or subscription ID."
        placeholder="Search by workspace, owner, customer ID, or subscription ID"
        resultLabel={`${formatNumber(page.pageInfo.totalCount)} subscriptions`}
      />

      <div className="flex flex-col gap-5">
        <AdminDataTable empty={page.items.length === 0}>
          <Table className="min-w-[76rem] table-fixed">
            <TableCaption className="sr-only">
              Workspace-scoped billing state and usage context.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Workspace</TableHead>
                <TableHead className="w-[18rem]">Owner</TableHead>
                <TableHead className="w-[9rem]">Current plan</TableHead>
                <TableHead className="w-[10rem]">Status</TableHead>
                <TableHead className="w-[10rem]">Provider</TableHead>
                <TableHead className="w-[11rem]">Renewal</TableHead>
                <TableHead className="w-[12rem]">Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.workspaceId}>
                  <TableCell className="w-[18rem]">
                    <Link
                      className="table-meta-stack max-w-full"
                      href={`/admin/subscriptions/${item.workspaceId}`}
                      prefetch={true}
                    >
                      <span className="table-link">{item.workspaceName}</span>
                      <span className="table-supporting-text">
                        {item.workspaceSlug}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="w-[18rem] table-emphasis">
                    {item.ownerEmail}
                  </TableCell>
                  <TableCell className="w-[9rem] capitalize">
                    {item.currentPlan}
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    <AdminStatusBadge status={item.subscriptionStatus} />
                  </TableCell>
                  <TableCell className="w-[10rem]">
                    {item.billingProvider ?? "None"}
                  </TableCell>
                  <TableCell className="w-[11rem] text-muted-foreground">
                    {formatDateTime(item.currentPeriodEnd)}
                  </TableCell>
                  <TableCell className="w-[12rem] text-muted-foreground">
                    {formatNumber(item.businessCount)} businesses /{" "}
                    {formatNumber(item.memberCount)} members
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          pageInfo={page.pageInfo}
          pathname="/admin/subscriptions"
          searchParams={resolvedSearchParams}
        />
      </div>
    </DashboardPage>
  );
}
