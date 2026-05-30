import { getInvoiceDetailForBusiness } from "@/features/invoices/queries";
import {
  createInvoicePdf,
  getInvoicePdfFileName,
} from "@/features/invoices/pdf";
import type { InvoiceDocumentData } from "@/features/invoices/pdf";
import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { id: invoiceId } = await params;

  const access = await getWorkspaceBusinessActionContext();
  if (!access.ok) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { businessContext } = access;

  const invoice = await getInvoiceDetailForBusiness(
    businessContext.business.id,
    invoiceId,
  );

  if (!invoice) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const documentData: InvoiceDocumentData = {
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    businessName: businessContext.business.name,
    businessEmail: invoice.businessContactEmail,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    currency: invoice.currency,
    subtotalInCents: invoice.subtotalInCents,
    discountInCents: invoice.discountInCents,
    taxInCents: invoice.taxInCents,
    taxLabel: invoice.taxLabel,
    totalInCents: invoice.totalInCents,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    issuedAt: invoice.issuedAt?.toISOString() ?? invoice.createdAt.toISOString(),
    notes: invoice.notes?.slice(0, 600) ?? null,
    terms: invoice.terms?.slice(0, 600) ?? null,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
      lineTotalInCents: item.lineTotalInCents,
    })),
  };

  const pdfBytes = await createInvoicePdf(documentData);
  const fileName = getInvoicePdfFileName(documentData);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(fileName),
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
