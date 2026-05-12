import { z } from "zod";

import {
  getQuoteExportRowsForBusiness,
} from "@/features/quotes/queries";
import { quoteListFiltersSchema } from "@/features/quotes/schemas";
import {
  buildCsv,
  formatCentsForExport,
  formatDateForExportFileName,
} from "@/lib/csv";
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
      { error: "Upgrade to Pro to export quote data." },
      { status: 403 },
    );
  }

  const parsedFilters = quoteListFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        view: "active" as const,
        status: "all" as const,
        sort: "newest" as const,
        page: 1,
      };

  const dateParams = z
    .object({
      from: exportDateSchema,
      to: exportDateSchema,
    })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  const from = dateParams.success ? dateParams.data.from : undefined;
  const to = dateParams.success ? dateParams.data.to : undefined;
  const rows = await getQuoteExportRowsForBusiness({
    businessId: requestContext.businessContext.business.id,
    filters: {
      q: filters.q,
      view: filters.view,
      status: filters.status,
      sort: filters.sort,
    },
    from,
    to,
  });

  const csv = buildCsv(
    [
      {
        header: "quote_number",
        render: (row) => row.quoteNumber,
      },
      {
        header: "title",
        render: (row) => row.title,
      },
      {
        header: "customer_name",
        render: (row) => row.customerName,
      },
      {
        header: "customer_email",
        render: (row) => row.customerEmail,
      },
      {
        header: "status",
        render: (row) => row.status,
      },
      {
        header: "archived_at",
        render: (row) => row.archivedAt?.toISOString(),
      },
      {
        header: "voided_at",
        render: (row) => row.voidedAt?.toISOString(),
      },
      {
        header: "post_acceptance_status",
        render: (row) => row.postAcceptanceStatus,
      },
      {
        header: "linked_inquiry_id",
        render: (row) => row.inquiryId,
      },
      {
        header: "valid_until",
        render: (row) => row.validUntil,
      },
      {
        header: "total_amount",
        render: (row) => formatCentsForExport(row.totalInCents),
      },
      {
        header: "currency",
        render: (row) => row.currency,
      },
      {
        header: "created_at",
        render: (row) => row.createdAt.toISOString(),
      },
      {
        header: "sent_at",
        render: (row) => row.sentAt?.toISOString(),
      },
      {
        header: "customer_responded_at",
        render: (row) => row.customerRespondedAt?.toISOString(),
      },
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(
        `quotes-${formatDateForExportFileName()}.csv`,
      ),
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
