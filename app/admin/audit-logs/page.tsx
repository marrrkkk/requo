import {
  DashboardPage,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  buildAdminPageHref,
  formatDateTime,
  formatMetadataPreview,
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
    <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground">
      {label}
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
        eyebrow="Internal admin"
        title="Audit logs"
      />

      <DashboardSection title="Filter audit logs">
        <form
          action="/admin/audit-logs"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
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
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground">
            Admin
            <Input
              defaultValue={filters.admin}
              name="admin"
              placeholder="Email or user ID"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground">
            Target ID
            <Input
              defaultValue={filters.targetId}
              name="targetId"
              placeholder="Target ID"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground">
            From
            <Input defaultValue={filters.from} name="from" type="date" />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground">
            To
            <Input defaultValue={filters.to} name="to" type="date" />
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </div>
        </form>
      </DashboardSection>

      <DashboardSection
        description="Newest internal admin events first."
        title="Internal admin audit"
      >
        <AdminDataTable empty={page.items.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Request</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>{item.adminEmail}</TableCell>
                  <TableCell>{item.action}</TableCell>
                  <TableCell>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span>{item.targetType}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.targetId}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>{formatMetadataPreview(item.metadata)}</TableCell>
                  <TableCell>
                    {item.ipAddress ?? "No IP"} /{" "}
                    {item.userAgent ? item.userAgent.slice(0, 60) : "No UA"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminDataTable>

        <AdminPagination
          hrefForPage={(nextPage) =>
            buildAdminPageHref(
              "/admin/audit-logs",
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
