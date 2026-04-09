import { z } from "zod";

import { getInquiryDocumentData } from "@/features/inquiries/documents";
import { getInquiryPdfFileName } from "@/features/inquiries/pdf";
import { getInquiryDetailForBusiness } from "@/features/inquiries/queries";
import { getBusinessInquiryPrintPath } from "@/features/businesses/routes";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";
import { renderHtmlPageToPdf } from "@/lib/pdf/html-to-pdf";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  id: z.string().trim().min(1).max(128),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
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

  const inquiry = await getInquiryDetailForBusiness({
    businessId: requestContext.businessContext.business.id,
    inquiryId: parsedParams.data.id,
  });

  if (!inquiry) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const documentData = getInquiryDocumentData({
    businessName: requestContext.businessContext.business.name,
    businessCurrency: requestContext.businessContext.business.defaultCurrency,
    inquiry,
  });
  const printUrl = new URL(
    `${getBusinessInquiryPrintPath(parsedParams.data.slug, inquiry.id)}?autoprint=0`,
    request.url,
  ).toString();
  const pdf = await renderHtmlPageToPdf({
    url: printUrl,
    cookieHeader: request.headers.get("cookie"),
  });

  const pdfBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(pdf);
      controller.close();
    },
  });

  return new Response(pdfBody, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(
        getInquiryPdfFileName(documentData),
      ),
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
