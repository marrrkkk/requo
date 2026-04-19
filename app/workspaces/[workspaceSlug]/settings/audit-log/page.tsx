import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceAuditLogFilters } from "@/features/audit/components/workspace-audit-log-filters";
import { WorkspaceAuditLogTable } from "@/features/audit/components/workspace-audit-log-table";
import {
  getWorkspaceAuditLogFiltersBySlug,
  getWorkspaceAuditLogPageBySlug,
  parseAuditLogFilters,
} from "@/features/audit/queries";
import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";
import { getWorkspaceOwnerPageContext } from "../_lib/page-context";

type WorkspaceAuditLogPageProps = {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildAuditPageHref(
  workspaceSlug: string,
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    params.set(key, value);
  }

  params.set("page", String(page));

  return `${getWorkspaceSettingsPath(workspaceSlug, "audit-log")}?${params.toString()}`;
}

export default async function WorkspaceAuditLogPage({
  params,
  searchParams,
}: WorkspaceAuditLogPageProps) {
  const [{ workspaceSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, workspace } = await getWorkspaceOwnerPageContext(workspaceSlug);
  const filters = parseAuditLogFilters(resolvedSearchParams);
  const [page, filterOptions] = await Promise.all([
    getWorkspaceAuditLogPageBySlug(user.id, workspace.slug, filters),
    getWorkspaceAuditLogFiltersBySlug(user.id, workspace.slug),
  ]);

  if (!page || !filterOptions) {
    return null;
  }

  const filterAction = getWorkspaceSettingsPath(workspace.slug, "audit-log");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Track meaningful billing, lifecycle, member, and security events across the workspace."
        eyebrow="Audit log"
        title="Workspace audit log"
      />

      <WorkspaceAuditLogFilters
        action={filterAction}
        filters={filters}
        options={filterOptions}
      />

      <WorkspaceAuditLogTable
        buildPageHref={(nextPage) =>
          buildAuditPageHref(workspace.slug, resolvedSearchParams, nextPage)
        }
        page={page}
      />
    </div>
  );
}
