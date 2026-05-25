import { z } from "zod";

import { getAutomationLogExportRowsForBusiness } from "@/features/automations/queries";
import { buildCsv, formatDateForExportFileName } from "@/lib/csv";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

const exportDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const requestContext = await getBusinessRequestContextForSlug(
    parsedParams.data.slug,
  );

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (
    !hasFeatureAccess(
      requestContext.businessContext.business.plan,
      "exports",
    )
  ) {
    return Response.json(
      { error: "Upgrade to Pro to export automation logs." },
      { status: 403 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const dateParams = z
    .object({
      from: exportDateSchema,
      to: exportDateSchema,
    })
    .safeParse(Object.fromEntries(searchParams.entries()));

  const from = dateParams.success ? dateParams.data.from : undefined;
  const to = dateParams.success ? dateParams.data.to : undefined;

  const rows = await getAutomationLogExportRowsForBusiness({
    businessId: requestContext.businessContext.business.id,
    from,
    to,
  });

  const csv = buildCsv(
    [
      {
        header: "id",
        render: (row) => row.id,
      },
      {
        header: "trigger_type",
        render: (row) => row.triggerType,
      },
      {
        header: "trigger_payload",
        render: (row) => JSON.stringify(row.triggerPayload),
      },
      {
        header: "actions_executed",
        render: (row) => JSON.stringify(row.actionsExecuted),
      },
      {
        header: "status",
        render: (row) => row.status,
      },
      {
        header: "duration_ms",
        render: (row) => row.durationMs,
      },
      {
        header: "error",
        render: (row) => row.error,
      },
      {
        header: "created_at",
        render: (row) => row.createdAt.toISOString(),
      },
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(
        `automation-logs-${formatDateForExportFileName()}.csv`,
      ),
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
