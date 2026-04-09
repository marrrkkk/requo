import type { DashboardQuoteDetail } from "@/features/quotes/types";

export type QuoteDocumentData = {
  businessName: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  validUntil: string;
  notes: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  items: DashboardQuoteDetail["items"];
};

export function getQuoteDocumentData({
  businessName,
  quote,
}: {
  businessName: string;
  quote: DashboardQuoteDetail;
}): QuoteDocumentData {
  return {
    businessName,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    currency: quote.currency,
    validUntil: quote.validUntil,
    notes: quote.notes,
    subtotalInCents: quote.subtotalInCents,
    discountInCents: quote.discountInCents,
    totalInCents: quote.totalInCents,
    items: quote.items,
  };
}
