import { z } from "zod";

import {
  getInquiryExportRowsForBusiness,
} from "@/features/inquiries/queries";
import { inquiryListFiltersSchema } from "@/features/inquiries/schemas";
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
      { error: "Upgrade to Pro to export inquiry data." },
      { status: 403 },
    );
  }

  const parsedFilters = inquiryListFiltersSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const filters = parsedFilters.success
    ? parsedFilters.data
    : {
        q: undefined,
        view: "active" as const,
        status: "all" as const,
        form: "all",
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
  const rows = await getInquiryExportRowsForBusiness({
    businessId: requestContext.businessContext.business.id,
    filters: {
      q: filters.q,
      view: filters.view,
      status: filters.status,
      form: filters.form,
      sort: filters.sort,
    },
    from,
    to,
  });

  const csv = buildCsv(
    [
      {
        header: "inquiry_id",
        render: (row) => row.id,
      },
      {
        header: "submitted_at",
        render: (row) => row.submittedAt.toISOString(),
      },
      {
        header: "form_name",
        render: (row) => row.inquiryFormName,
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
        header: "contact_method",
        render: (row) => row.customerContactMethod,
      },
      {
        header: "contact_handle",
        render: (row) => row.customerContactHandle,
      },
      {
        header: "service_category",
        render: (row) => row.serviceCategory,
      },
      {
        header: "subject",
        render: (row) => row.subject,
      },
      {
        header: "status",
        render: (row) => row.status,
      },
      {
        header: "record_state",
        render: (row) => row.recordState,
      },
      {
        header: "budget_text",
        render: (row) => row.budgetText,
      },
      {
        header: "requested_deadline",
        render: (row) => row.requestedDeadline,
      },
      {
        header: "details",
        render: (row) => row.details,
      },
      {
        header: "archived_at",
        render: (row) => row.archivedAt?.toISOString(),
      },
      {
        header: "deleted_at",
        render: (row) => row.deletedAt?.toISOString(),
      },
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(
        `inquiries-${formatDateForExportFileName()}.csv`,
      ),
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
