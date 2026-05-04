import { z } from "zod";

import {
  getWorkspaceAuditLogExportRowsBySlug,
  parseAuditLogFilters,
} from "@/features/audit/queries";
import { getWorkspaceSettingsBySlug } from "@/features/workspaces/queries";
import { buildCsv, formatDateForExportFileName } from "@/lib/csv";
import { getOptionalSession } from "@/lib/auth/session";
import { buildContentDisposition } from "@/lib/files";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  workspaceSlug: z.string().trim().min(1).max(120),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceSlug: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const session = await getOptionalSession();

  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const workspace = await getWorkspaceSettingsBySlug(
    session.user.id,
    parsedParams.data.workspaceSlug,
  );

  if (!workspace || workspace.memberRole !== "owner") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(workspace.plan, "exports")) {
    return Response.json(
      { error: "Upgrade to Pro to export audit logs." },
      { status: 403 },
    );
  }

  const filters = parseAuditLogFilters(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const rows = await getWorkspaceAuditLogExportRowsBySlug(
    session.user.id,
    workspace.slug,
    filters,
  );

  if (!rows) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const csv = buildCsv(
    [
      {
        header: "log_id",
        render: (row) => row.id,
      },
      {
        header: "created_at",
        render: (row) => row.createdAt.toISOString(),
      },
      {
        header: "actor_name",
        render: (row) => row.actorName,
      },
      {
        header: "actor_email",
        render: (row) => row.actorEmail,
      },
      {
        header: "action",
        render: (row) => row.action,
      },
      {
        header: "entity_type",
        render: (row) => row.entityType,
      },
      {
        header: "entity_id",
        render: (row) => row.entityId,
      },
      {
        header: "business_name",
        render: (row) => row.businessName,
      },
      {
        header: "business_slug",
        render: (row) => row.businessSlug,
      },
      {
        header: "source",
        render: (row) => row.source,
      },
      {
        header: "metadata",
        render: (row) => JSON.stringify(row.metadata ?? {}),
      },
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(
        `audit-log-${formatDateForExportFileName()}.csv`,
      ),
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
