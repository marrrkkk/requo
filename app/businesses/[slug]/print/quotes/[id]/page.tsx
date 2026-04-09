import { notFound } from "next/navigation";

import { PrintPageShell } from "@/components/shared/print-page-shell";
import { QuotePrintDocument } from "@/features/quotes/components/quote-print-document";
import { getQuoteDetailForBusiness } from "@/features/quotes/queries";
import { quoteRouteParamsSchema } from "@/features/quotes/schemas";
import { getBusinessQuotePath } from "@/features/businesses/routes";
import { getBusinessRequestContextForSlug } from "@/lib/db/business-access";

type QuotePrintPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function QuotePrintPage({
  params,
}: QuotePrintPageProps) {
  const resolvedParams = await params;
  const requestContext = await getBusinessRequestContextForSlug(
    resolvedParams.slug,
  );

  const parsedParams = quoteRouteParamsSchema.safeParse({
    id: resolvedParams.id,
  });

  if (!parsedParams.success || !requestContext) {
    notFound();
  }

  const quote = await getQuoteDetailForBusiness({
    businessId: requestContext.businessContext.business.id,
    quoteId: parsedParams.data.id,
  });

  if (!quote) {
    notFound();
  }

  return (
    <PrintPageShell
      backHref={getBusinessQuotePath(resolvedParams.slug, quote.id)}
      backLabel="Back to quote"
      description="Customer-facing quote content only. This page is cleanly printable and opens the browser print dialog automatically."
      title={`Quote ${quote.quoteNumber}`}
    >
      <QuotePrintDocument
        businessName={requestContext.businessContext.business.name}
        quote={quote}
      />
    </PrintPageShell>
  );
}
