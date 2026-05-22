import { getInvoiceDetailForBusiness } from "@/features/invoices/queries";
import { createInvoicePdf, getInvoicePdfFileName } from "@/features/invoices/pdf";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;

  const requestContext = await getBusinessRequestContextForSlug(slug);

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const invoice = await getInvoiceDetailForBusiness(
    requestContext.businessContext.business.id,
    id,
  );

  if (!invoice) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    businessName: invoice.businessName,
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
    notes: invoice.notes,
    terms: invoice.terms,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
      lineTotalInCents: item.lineTotalInCents,
    })),
  };

  const pdfBytes = await createInvoicePdf(pdfData);
  const fileName = getInvoicePdfFileName(pdfData);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(fileName),
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
