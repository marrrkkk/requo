import { z } from "zod";

import { getPaymentDetailForBusiness } from "@/features/invoices/queries";
import { createPaymentReceiptPdf, getPaymentReceiptData, getPaymentReceiptFileName } from "@/features/invoices/receipt";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  paymentId: z.string().trim().min(1).max(128),
});

const methodLabels = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; paymentId: string }> },
) {
  const parsedParams = routeParamsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const requestContext = await getBusinessRequestContextForSlug(parsedParams.data.slug);

  if (!requestContext) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const payment = await getPaymentDetailForBusiness({
    businessId: requestContext.businessContext.business.id,
    paymentId: parsedParams.data.paymentId,
  });

  if (!payment) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const documentData = getPaymentReceiptData({
    businessName: requestContext.businessContext.business.name,
    payment,
    methodLabel: methodLabels[payment.method] ?? payment.method,
  });
  const pdf = await createPaymentReceiptPdf(documentData);
  const pdfBytes = Uint8Array.from(pdf);

  return new Response(new Blob([pdfBytes], { type: "application/pdf" }), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(getPaymentReceiptFileName(documentData)),
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
