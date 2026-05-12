import { z } from "zod";

import { getQuoteDocumentData } from "@/features/quotes/documents";
import { getQuotePdfFileName, getQuotePngFileName } from "@/features/quotes/pdf";
import { getQuoteDetailForBusiness } from "@/features/quotes/queries";
import { getBusinessQuotePrintPath } from "@/features/businesses/routes";
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
      { error: "Upgrade to Pro to export quote data." },
      { status: 403 },
    );
  }

  const quote = await getQuoteDetailForBusiness({
    businessId: requestContext.businessContext.business.id,
    quoteId: parsedParams.data.id,
  });

  if (!quote) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const formatResult = exportFormatSchema.safeParse(
    new URL(request.url).searchParams.get("format") ?? "pdf",
  );
  const format = formatResult.success ? formatResult.data : "pdf";
  const printUrl = new URL(
    `${getBusinessQuotePrintPath(parsedParams.data.slug, quote.id)}?autoprint=0`,
    request.url,
  ).toString();
  const documentData = getQuoteDocumentData({
    businessName: requestContext.businessContext.business.name,
    quote,
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
        "content-disposition": buildContentDisposition(
          getQuotePngFileName(documentData),
        ),
        "content-type": "image/png",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const pdf = await createPdfFromPng({
    png,
    title: `${documentData.quoteNumber} ${documentData.title}`,
  });
  const pdfBytes = Uint8Array.from(pdf);

  return new Response(new Blob([pdfBytes], { type: "application/pdf" }), {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": buildContentDisposition(
        getQuotePdfFileName(documentData),
      ),
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    },
  });
}
