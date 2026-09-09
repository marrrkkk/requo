import { z } from "zod";

import { getBusinessInvoicePrintPath } from "@/features/businesses/routes";
import { getInvoiceDocumentData } from "@/features/invoices/documents";
import { getInvoicePdfFileName, getInvoicePngFileName } from "@/features/invoices/pdf";
import { getInvoiceForBusiness } from "@/features/invoices/queries";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";
import { renderHtmlPageElementToPng } from "@/lib/pdf/html-to-image";
import { createPdfFromPng } from "@/lib/pdf/png-to-pdf";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  invoiceId: z.string().trim().min(1).max(128),
});
const exportFormatSchema = z.enum(["pdf", "png"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; invoiceId: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const requestContext = await getBusinessRequestContextForSlug(parsedParams.data.slug);

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!hasFeatureAccess(requestContext.businessContext.business.plan, "exports")) {
    return Response.json(
      { error: "Upgrade to Pro to export invoice data." },
      { status: 403 },
    );
  }

  const invoice = await getInvoiceForBusiness({
    businessId: requestContext.businessContext.business.id,
    invoiceId: parsedParams.data.invoiceId,
  });

  if (!invoice) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const formatResult = exportFormatSchema.safeParse(
    new URL(request.url).searchParams.get("format") ?? "pdf",
  );
  const format = formatResult.success ? formatResult.data : "pdf";
  const printUrl = new URL(
    `${getBusinessInvoicePrintPath(parsedParams.data.slug, invoice.id)}?autoprint=0`,
    request.url,
  ).toString();
  const documentData = getInvoiceDocumentData({
    businessName: requestContext.businessContext.business.name,
    invoice,
  });
  const png = await renderHtmlPageElementToPng({
    url: printUrl,
    selector: "[data-export-document]",
    cookieHeader: request.headers.get("cookie"),
  });

  if (format === "png") {
    const pngBytes = Uint8Array.from(png);

    return new Response(new Blob([pngBytes], { type: "image/png" }), {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": buildContentDisposition(getInvoicePngFileName(documentData)),
        "content-type": "image/png",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const pdf = await createPdfFromPng({
    png,
    title: `${documentData.invoiceNumber} ${documentData.title}`,
  });
  const pdfBytes = Uint8Array.from(pdf);

  return new Response(new Blob([pdfBytes], { type: "application/pdf" }), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(getInvoicePdfFileName(documentData)),
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
