import { Download } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ProFeatureNoticeButton } from "@/components/shared/pro-feature-notice-button";
import { Button } from "@/components/ui/button";
import { WorkspaceAuditLogFilters } from "@/features/audit/components/workspace-audit-log-filters";
import { WorkspaceAuditLogTable } from "@/features/audit/components/workspace-audit-log-table";
import {
  getWorkspaceAuditLogFiltersBySlug,
  getWorkspaceAuditLogPageBySlug,
  parseAuditLogFilters,
} from "@/features/audit/queries";
import {
  getWorkspaceAuditLogExportPath,
  getWorkspaceSettingsPath,
} from "@/features/workspaces/routes";
import { hasFeatureAccess } from "@/lib/plans";
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

function buildAuditExportHref(
  workspaceSlug: string,
  searchParams: Record<string, string | string[] | undefined>,
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

  return `${getWorkspaceAuditLogExportPath(workspaceSlug)}${
    params.size ? `?${params.toString()}` : ""
  }`;
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
  const canExport = hasFeatureAccess(workspace.plan, "exports");
  const exportHref = buildAuditExportHref(workspace.slug, resolvedSearchParams);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Track meaningful billing, lifecycle, member, and security events across the workspace."
        eyebrow="Audit log"
        title="Workspace audit log"
        actions={
          canExport ? (
            <Button asChild variant="outline">
              <a href={exportHref}>
                <Download data-icon="inline-start" />
                Export CSV
              </a>
            </Button>
          ) : (
            <ProFeatureNoticeButton
              noticeDescription="Upgrade to Pro to export audit logs."
              noticeTitle="Export is a Pro feature."
              variant="outline"
            >
              <Download data-icon="inline-start" />
              Export CSV
            </ProFeatureNoticeButton>
          )
        }
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
