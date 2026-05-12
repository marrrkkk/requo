import { z } from "zod";

import { getInquiryDocumentData } from "@/features/inquiries/documents";
import {
  getInquiryPdfFileName,
  getInquiryPngFileName,
} from "@/features/inquiries/pdf";
import { getInquiryDetailForBusiness } from "@/features/inquiries/queries";
import { getBusinessInquiryPrintPath } from "@/features/businesses/routes";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";
import { buildContentDisposition } from "@/lib/files";
import { renderHtmlPageElementToPng } from "@/lib/pdf/html-to-image";
import { createPdfFromPng } from "@/lib/pdf/png-to-pdf";
import { hasFeatureAccess } from "@/lib/plans";

const routeParamsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  id: z.string().trim().min(1).max(128),
});
const exportFormatSchema = z.enum(["pdf", "png"]);

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

  const inquiry = await getInquiryDetailForBusiness({
    businessId: requestContext.businessContext.business.id,
    inquiryId: parsedParams.data.id,
  });

  if (!inquiry) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const formatResult = exportFormatSchema.safeParse(
    new URL(request.url).searchParams.get("format") ?? "pdf",
  );
  const format = formatResult.success ? formatResult.data : "pdf";
  const documentData = getInquiryDocumentData({
    businessName: requestContext.businessContext.business.name,
    businessCurrency: requestContext.businessContext.business.defaultCurrency,
    inquiry,
  });
  const printUrl = new URL(
    `${getBusinessInquiryPrintPath(parsedParams.data.slug, inquiry.id)}?autoprint=0`,
    request.url,
  ).toString();
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
        "content-disposition": buildContentDisposition(
          getInquiryPngFileName(documentData),
        ),
        "content-type": "image/png",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const pdf = await createPdfFromPng({
    png,
    title: `${documentData.referenceId} request`,
  });
  const pdfBytes = Uint8Array.from(pdf);

  return new Response(new Blob([pdfBytes], { type: "application/pdf" }), {
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
