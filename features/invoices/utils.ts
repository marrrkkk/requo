import { formatQuoteMoney, getTodayUtcDateString } from "@/features/quotes/utils";
import type { InvoiceStatus } from "@/features/invoices/types";

export { formatQuoteMoney };

export function parseMoneyToCents(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) return Number.NaN;
    return value;
  }
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.trim().replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return Number.NaN;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = Number(fraction || "0");
  const result = whole * 100 + cents;
  return Number.isSafeInteger(result) ? result : Number.NaN;
}

export function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calculateInvoicePaymentState({
  totalInCents,
  paidInCents,
  dueDate,
  lifecycleStatus,
  today = getTodayUtcDateString(),
}: {
  totalInCents: number;
  paidInCents: number;
  dueDate: string;
  lifecycleStatus: InvoiceStatus;
  today?: string;
}): { paidInCents: number; balanceInCents: number; status: InvoiceStatus } {
  const paid = Math.min(Math.max(0, paidInCents), Math.max(0, totalInCents));
  const balance = Math.max(0, totalInCents - paid);
  if (lifecycleStatus === "draft" || lifecycleStatus === "voided") {
    return { paidInCents: paid, balanceInCents: balance, status: lifecycleStatus };
  }
  if (balance === 0) return { paidInCents: paid, balanceInCents: 0, status: "paid" };
  if (dueDate < today) return { paidInCents: paid, balanceInCents: balance, status: "overdue" };
  if (paid > 0) return { paidInCents: paid, balanceInCents: balance, status: "partially_paid" };
  return { paidInCents: 0, balanceInCents: balance, status: "unpaid" };
}

export function getInvoiceStatusLabel(status: InvoiceStatus) {
  return {
    draft: "Draft",
    sent: "Sent",
    unpaid: "Unpaid",
    partially_paid: "Partially paid",
    paid: "Paid",
    overdue: "Overdue",
    voided: "Void",
  }[status];
}
