import { z } from "zod";

import { getInvoiceExportRowsForBusiness } from "@/features/invoices/queries";
import type { InvoiceStatus } from "@/features/invoices/types";
import { buildCsv, formatCentsForExport, formatDateForExportFileName } from "@/lib/csv";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

const statuses: Array<"all" | InvoiceStatus> = [
  "all",
  "draft",
  "sent",
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "voided",
];

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const requestContext = await getBusinessRequestContextForSlug(parsedParams.data.slug);

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(requestContext.businessContext.business.plan, "exports")) {
    return Response.json({ error: "Upgrade to Pro to export invoice data." }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const q = searchParams.get("q") ?? undefined;
  const rawStatus = searchParams.get("status") ?? "all";
  const status = statuses.includes(rawStatus as never) ? (rawStatus as "all" | InvoiceStatus) : "all";

  const rows = await getInvoiceExportRowsForBusiness({
    businessId: requestContext.businessContext.business.id,
    filters: { q, status, page: 1 },
  });

  const csv = buildCsv(
    [
      { header: "invoice_number", render: (row) => row.invoiceNumber },
      { header: "title", render: (row) => row.title },
      { header: "customer_name", render: (row) => row.customerName },
      { header: "customer_email", render: (row) => row.customerEmail },
      { header: "status", render: (row) => row.status },
      { header: "linked_quote_id", render: (row) => row.quoteId },
      { header: "issue_date", render: (row) => row.issueDate },
      { header: "due_date", render: (row) => row.dueDate },
      { header: "total_amount", render: (row) => formatCentsForExport(row.totalInCents) },
      { header: "paid_amount", render: (row) => formatCentsForExport(row.paidInCents) },
      { header: "currency", render: (row) => row.currency },
      { header: "created_at", render: (row) => row.createdAt.toISOString() },
      { header: "sent_at", render: (row) => row.sentAt?.toISOString() },
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(`invoices-${formatDateForExportFileName()}.csv`),
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
