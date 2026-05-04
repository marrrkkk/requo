import {
  DashboardPage,
  DashboardToolbar,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  formatDateTime,
  formatMetadataPreview,
  formatNumber,
} from "@/features/admin/components/admin-common";
import { adminAuditLogPageDescription } from "@/features/admin/constants";
import { requireAdminPage } from "@/features/admin/page-guard";
import { getAdminAuditLogsPage } from "@/features/admin/queries";
import { parseAdminAuditLogFilters } from "@/features/admin/schemas";
import { adminAuditActions, adminAuditTargetTypes } from "@/features/admin/types";

type AdminAuditLogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="meta-label px-0.5">{label}</span>
      <select
        className="control-surface h-10 rounded-md border border-border/85 px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15"
        defaultValue={value}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminAuditLogsPage({
  searchParams,
}: AdminAuditLogsPageProps) {
  await requireAdminPage();
  const resolvedSearchParams = await searchParams;
  const filters = parseAdminAuditLogFilters(resolvedSearchParams);
  const page = await getAdminAuditLogsPage(filters);

  return (
    <DashboardPage>
      <PageHeader
        description={adminAuditLogPageDescription}
        title="Audit logs"
      />

      <DashboardToolbar>
        <form
          action="/admin/audit-logs"
          className="flex flex-col gap-4"
        >
          <div className="data-list-toolbar-summary">
            <p className="text-sm leading-6 text-muted-foreground">
              Filter internal admin access and support actions.
            </p>
            <p className="data-list-toolbar-count">
              {formatNumber(page.pageInfo.totalCount)} events
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              label="Action"
              name="action"
              options={[
                { label: "All actions", value: "all" },
                ...adminAuditActions.map((action) => ({
                  label: action,
                  value: action,
                })),
              ]}
              value={filters.action}
            />
            <SelectField
              label="Target type"
              name="targetType"
              options={[
                { label: "All targets", value: "all" },
                ...adminAuditTargetTypes.map((targetType) => ({
                  label: targetType,
                  value: targetType,
                })),
              ]}
              value={filters.targetType}
            />
            <label className="flex min-w-0 flex-col gap-2">
              <span className="meta-label px-0.5">Admin</span>
              <Input
                defaultValue={filters.admin}
                name="admin"
                placeholder="Email or user ID"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="meta-label px-0.5">Target ID</span>
              <Input
                defaultValue={filters.targetId}
                name="targetId"
                placeholder="Target ID"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="meta-label px-0.5">From</span>
              <Input defaultValue={filters.from} name="from" type="date" />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="meta-label px-0.5">To</span>
              <Input defaultValue={filters.to} name="to" type="date" />
            </label>
            <div className="flex items-end">
              <Button className="w-full sm:w-auto" type="submit" variant="outline">
                Apply filters
              </Button>
            </div>
          </div>
        </form>
      </DashboardToolbar>

      <div className="flex flex-col gap-5">
        <AdminDataTable empty={page.items.length === 0}>
          <Table className="min-w-[86rem] table-fixed">
            <TableCaption className="sr-only">
              Newest internal admin audit events appear first.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12rem]">When</TableHead>
                <TableHead className="w-[18rem]">Admin</TableHead>
                <TableHead className="w-[18rem]">Action</TableHead>
                <TableHead className="w-[18rem]">Target</TableHead>
                <TableHead className="w-[22rem]">Metadata</TableHead>
                <TableHead className="w-[18rem]">Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="w-[12rem] text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell className="w-[18rem] table-emphasis">
                    {item.adminEmail}
                  </TableCell>
                  <TableCell className="w-[18rem] table-emphasis">
                    {item.action}
                  </TableCell>
                  <TableCell className="w-[18rem]">
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="table-emphasis">{item.targetType}</span>
                      <span className="table-supporting-text">
                        {item.targetId}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="w-[22rem] text-muted-foreground">
                    <span className="block truncate">
                      {formatMetadataPreview(item.metadata)}
                    </span>
                  </TableCell>
                  <TableCell className="w-[18rem] text-muted-foreground">
                    {item.ipAddress ?? "No IP"} /{" "}
                    {item.userAgent ? item.userAgent.slice(0, 60) : "No UA"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          pageInfo={page.pageInfo}
          pathname="/admin/audit-logs"
          searchParams={resolvedSearchParams}
        />
      </div>
    </DashboardPage>
  );
}
