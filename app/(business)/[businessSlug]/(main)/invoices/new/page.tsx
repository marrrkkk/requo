import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { getBusinessInvoicesPath } from "@/features/businesses/routes";
import { createInvoiceAction } from "@/features/invoices/actions";
import { NewInvoiceForm } from "@/features/invoices/components/new-invoice-form";
import { getQuoteDetailForBusiness } from "@/features/quotes/queries";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type NewInvoicePageProps = {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "New invoice",
  description: "Create a manual invoice or convert an accepted quote.",
});

export const instant = true;

/**
 * New invoice page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, searchParams, getAppShellContext, quote
 * prefill) are pushed into a `<Suspense>`-wrapped child server component so
 * the shell paints instantly on client navigation.
 */
export default function NewInvoicePage({ params, searchParams }: NewInvoicePageProps) {
  return (
    <DashboardPage>
      <RegionErrorBoundary fallback={<NewInvoiceSkeleton />}>
        <Suspense fallback={<NewInvoiceSkeleton />}>
          <NewInvoiceContent params={params} searchParams={searchParams} />
        </Suspense>
      </RegionErrorBoundary>
    </DashboardPage>
  );
}

function NewInvoiceSkeleton() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="New invoice" description="Create a manual invoice." />
      <div className="h-[34rem] animate-pulse rounded-lg bg-muted/40" />
    </>
  );
}

async function NewInvoiceContent({ params, searchParams }: NewInvoicePageProps) {
  const [{ businessSlug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const { businessContext } = await getAppShellContext(businessSlug);

  const rawQuoteId = Array.isArray(rawSearchParams.quoteId) ? rawSearchParams.quoteId[0] : rawSearchParams.quoteId;
  const quoteId = typeof rawQuoteId === "string" && rawQuoteId.trim() ? rawQuoteId.trim() : null;
  const quote = quoteId
    ? await getQuoteDetailForBusiness({ businessId: businessContext.business.id, quoteId })
    : null;

  if (quoteId && (!quote || quote.status !== "accepted")) {
    redirect(getBusinessInvoicesPath(businessSlug));
  }

  const action = createInvoiceAction.bind(null, quoteId);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="New invoice"
        description={
          quote ? `Convert accepted quote ${quote.quoteNumber} into an invoice.` : "Create a manual invoice."
        }
      />
      <NewInvoiceForm
        action={action}
        businessSlug={businessSlug}
        currency={businessContext.business.defaultCurrency}
        quote={
          quote
            ? {
                quoteNumber: quote.quoteNumber,
                title: quote.title,
                customerName: quote.customerName,
                customerEmail: quote.customerEmail,
                customerContactMethod: quote.customerContactMethod,
                customerContactHandle: quote.customerContactHandle,
                items: quote.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPriceInCents: item.unitPriceInCents,
                })),
              }
            : null
        }
      />
    </>
  );
}
