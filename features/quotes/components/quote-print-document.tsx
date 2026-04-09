import { QuotePreview } from "@/features/quotes/components/quote-preview";
import type { DashboardQuoteDetail } from "@/features/quotes/types";

const MAX_PRINT_ITEMS = 8;
const MAX_PRINT_NOTES_CHARS = 320;

type QuotePrintDocumentProps = {
  businessName: string;
  quote: DashboardQuoteDetail;
};

export function QuotePrintDocument({
  businessName,
  quote,
}: QuotePrintDocumentProps) {
  const items = quote.items.slice(0, MAX_PRINT_ITEMS);
  const hiddenItemCount = Math.max(0, quote.items.length - items.length);
  const notes = quote.notes?.trim()
    ? quote.notes.trim().slice(0, MAX_PRINT_NOTES_CHARS)
    : null;
  const notesTruncated = Boolean(
    quote.notes?.trim() && quote.notes.trim().length > MAX_PRINT_NOTES_CHARS,
  );

  return (
    <div className="print:text-[11px]">
      <QuotePreview
        businessName={businessName}
        className="print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none print:[zoom:0.86]"
        currency={quote.currency}
        customerEmail={quote.customerEmail}
        customerName={quote.customerName}
        discountInCents={quote.discountInCents}
        items={items}
        notes={
          notes
            ? `${notes}${notesTruncated ? "..." : ""}`
            : null
        }
        quoteNumber={quote.quoteNumber}
        subtotalInCents={quote.subtotalInCents}
        title={quote.title}
        totalInCents={quote.totalInCents}
        validUntil={quote.validUntil}
      />
      {hiddenItemCount > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground print:mt-1">
          +{hiddenItemCount} additional line item
          {hiddenItemCount === 1 ? "" : "s"} omitted for one-page print.
        </p>
      ) : null}
    </div>
  );
}
