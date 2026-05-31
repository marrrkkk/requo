import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BusinessQuotePreviewShell } from "@/features/quotes/components/business-quote-preview-shell";
import {
  getBusinessContactEmailForPreview,
  getQuoteDetailForBusiness,
} from "@/features/quotes/queries";
import { quoteRouteParamsSchema } from "@/features/quotes/schemas";
import { getBusinessQuotePath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Quote preview",
  description: "Internal preview of a quote as the customer would see it.",
});

type QuotePreviewPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

export default async function QuotePreviewPage({
  params,
}: QuotePreviewPageProps) {
  const resolvedParams = await params;
  const { businessContext } = await getAppShellContext(
    resolvedParams.businessSlug,
  );

  const parsedParams = quoteRouteParamsSchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    notFound();
  }

  const businessSlug = businessContext.business.slug;
  const [quote, businessContactEmail] = await Promise.all([
    getQuoteDetailForBusiness({
      businessId: businessContext.business.id,
      quoteId: parsedParams.data.id,
    }),
    getBusinessContactEmailForPreview(businessContext.business.id),
  ]);

  if (!quote) {
    notFound();
  }

  const backHref = getBusinessQuotePath(businessSlug, quote.id);

  // Map DashboardQuoteDetail to the PublicQuoteView shape expected by the renderer
  const publicQuoteView = {
    id: quote.id,
    businessId: businessContext.business.id,
    token: "",
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    businessName: businessContext.business.name,
    businessSlug,
    businessPlan: businessContext.business.plan,
    businessShortDescription: null,
    businessContactEmail,
    businessLogoStoragePath: businessContext.business.logoStoragePath,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail ?? null,
    customerContactMethod: quote.customerContactMethod ?? "",
    customerContactHandle: quote.customerContactHandle ?? "",
    currency: quote.currency,
    notes: quote.notes ?? null,
    terms: quote.terms ?? null,
    validUntil: quote.validUntil,
    version: quote.version,
    status: quote.status,
    subtotalInCents: quote.subtotalInCents,
    discountInCents: quote.discountInCents,
    taxInCents: quote.taxInCents,
    taxLabel: quote.taxLabel ?? null,
    totalInCents: quote.totalInCents,
    sentAt: quote.sentAt ?? null,
    acceptedAt: quote.acceptedAt ?? null,
    publicViewedAt: null,
    customerRespondedAt: quote.customerRespondedAt ?? null,
    customerResponseMessage: quote.customerResponseMessage ?? null,
    items: quote.items,
  };

  return (
    <BusinessQuotePreviewShell
      quote={publicQuoteView}
      businessPlan={businessContext.business.plan}
      businessContactEmail={businessContactEmail}
      businessName={businessContext.business.name}
      backHref={backHref}
    />
  );
}
