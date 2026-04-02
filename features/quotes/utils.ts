import type {
  DashboardQuoteDetail,
  QuoteEditorLineItemValue,
  QuoteInquiryPrefill,
  QuoteStatus,
} from "@/features/quotes/types";

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export const quoteStatusVariants: Record<
  QuoteStatus,
  "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
> = {
  draft: "outline",
  sent: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "ghost",
};

export function getQuoteStatusLabel(status: QuoteStatus) {
  return quoteStatusLabels[status];
}

export function formatQuoteMoney(amountInCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

export function formatQuoteDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;

  if (Number.isNaN(date.getTime())) {
    return "Set a date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatQuoteDateTime(value: Date) {
  if (Number.isNaN(value.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function centsToMoneyInput(amountInCents: number) {
  if (!amountInCents) {
    return "";
  }

  return (amountInCents / 100).toFixed(2);
}

export function createQuoteEditorLineItem(): QuoteEditorLineItemValue {
  return {
    id: `draft_item_${crypto.randomUUID().replace(/-/g, "")}`,
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

export function parseCurrencyInputToCents(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    return 0;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return 0;
  }

  return Math.round(Number(normalized) * 100);
}

export function calculateQuoteEditorTotals(
  items: QuoteEditorLineItemValue[],
  discountValue: string,
) {
  const subtotalInCents = items.reduce((sum, item) => {
    const quantity = Number.parseInt(item.quantity.trim(), 10);
    const safeQuantity =
      Number.isFinite(quantity) && quantity > 0 ? quantity : 0;

    return sum + safeQuantity * parseCurrencyInputToCents(item.unitPrice);
  }, 0);
  const discountInCents = Math.min(
    subtotalInCents,
    parseCurrencyInputToCents(discountValue),
  );

  return {
    subtotalInCents,
    discountInCents,
    totalInCents: subtotalInCents - discountInCents,
  };
}

export function getDefaultQuoteValidityDate() {
  const date = new Date();

  date.setDate(date.getDate() + 14);

  return date.toISOString().slice(0, 10);
}

export function buildQuoteTitleFromInquiry(inquiry: QuoteInquiryPrefill) {
  return `${inquiry.serviceCategory} quote`;
}

export function getQuoteEditorInitialValuesFromInquiry(
  inquiry: QuoteInquiryPrefill,
) {
  return {
    title: buildQuoteTitleFromInquiry(inquiry),
    customerName: inquiry.customerName,
    customerEmail: inquiry.customerEmail,
    notes: [
      `Service/category: ${inquiry.serviceCategory}`,
      inquiry.requestedDeadline
        ? `Requested deadline: ${formatQuoteDate(inquiry.requestedDeadline)}`
        : null,
      inquiry.budgetText ? `Budget note: ${inquiry.budgetText}` : null,
      "",
      inquiry.details,
    ]
      .filter(Boolean)
      .join("\n"),
    validUntil: getDefaultQuoteValidityDate(),
    discount: "",
    items: [createQuoteEditorLineItem()],
  };
}

export function getQuoteEditorInitialValuesFromDetail(
  quote: DashboardQuoteDetail,
) {
  return {
    title: quote.title,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    notes: quote.notes ?? "",
    validUntil: quote.validUntil,
    discount: centsToMoneyInput(quote.discountInCents),
    items: quote.items.length
      ? quote.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: centsToMoneyInput(item.unitPriceInCents),
        }))
      : [createQuoteEditorLineItem()],
  };
}
