import { cn } from "@/lib/utils";
import { formatQuoteDate, formatQuoteMoney } from "@/features/quotes/utils";

type QuotePreviewItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents: number;
};

type QuotePreviewProps = {
  workspaceName: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  validUntil: string;
  notes?: string | null;
  items: QuotePreviewItem[];
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  className?: string;
};

export function QuotePreview({
  workspaceName,
  quoteNumber,
  title,
  customerName,
  customerEmail,
  currency,
  validUntil,
  notes,
  items,
  subtotalInCents,
  discountInCents,
  totalInCents,
  className,
}: QuotePreviewProps) {
  return (
    <article
      className={cn(
        "section-panel overflow-hidden p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="meta-label">Quote preview</span>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground">{workspaceName}</p>
            </div>
            <div className="soft-panel px-4 py-3 text-sm shadow-none">
              <p className="font-medium text-foreground">{quoteNumber}</p>
              <p className="mt-1 text-muted-foreground">
                Valid until {formatQuoteDate(validUntil)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="info-tile h-full shadow-none">
              <p className="meta-label">Prepared for</p>
              <p className="mt-2 font-medium text-foreground">{customerName}</p>
              <p className="text-sm text-muted-foreground">{customerEmail}</p>
            </div>

            <div className="info-tile h-full shadow-none">
              <p className="meta-label">Summary</p>
              <p className="mt-2 font-medium text-foreground">
                {items.length} {items.length === 1 ? "line item" : "line items"}
              </p>
              <p className="text-sm text-muted-foreground">
                Total {formatQuoteMoney(totalInCents, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.2rem] border border-border/75 bg-background/92">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/35 text-left">
              <tr>
                <th className="px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Item
                </th>
                <th className="px-4 py-3 text-center text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Unit price
                </th>
                <th className="px-4 py-3 text-right text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Line total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr className="border-t border-border/80" key={item.id}>
                    <td className="px-4 py-3 align-top text-foreground">
                      {item.description || "Untitled item"}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatQuoteMoney(item.unitPriceInCents, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatQuoteMoney(item.lineTotalInCents, currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    Add line items to preview the quote breakdown.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="soft-panel ml-auto flex w-full max-w-sm flex-col gap-3 px-4 py-4 shadow-none">
          <SummaryRow
            label="Subtotal"
            value={formatQuoteMoney(subtotalInCents, currency)}
          />
          <SummaryRow
            label="Discount"
            value={`-${formatQuoteMoney(discountInCents, currency)}`}
          />
          <div className="border-t pt-3">
            <SummaryRow
              label="Total"
              value={formatQuoteMoney(totalInCents, currency)}
              strong
            />
          </div>
        </div>

        {notes ? (
          <div className="soft-panel px-4 py-4 shadow-none">
            <p className="meta-label">Notes</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
              {notes}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm text-foreground",
          strong && "text-base font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}
