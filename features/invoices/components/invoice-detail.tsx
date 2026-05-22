"use client";

import { useTransition } from "react";
import Image from "next/image";
import { CheckCircle, Download, Mail, Printer, Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { Spinner } from "@/components/ui/spinner";
import { updateInvoiceStatusAction, sendInvoiceEmailAction } from "@/features/invoices/actions";
import type { DashboardInvoiceDetail, InvoiceStatus } from "@/features/invoices/types";

type InvoiceDetailProps = {
  invoice: DashboardInvoiceDetail;
  businessSlug: string;
  pdfExportHref: string;
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "DRAFT",
  sent: "AWAITING PAYMENT",
  viewed: "VIEWED",
  paid: "PAID",
  overdue: "OVERDUE",
  voided: "VOIDED",
};

const statusColors: Record<InvoiceStatus, string> = {
  draft: "text-muted-foreground",
  sent: "text-foreground",
  viewed: "text-foreground",
  paid: "text-primary",
  overdue: "text-destructive",
  voided: "text-muted-foreground",
};

export function InvoiceDetail({ invoice, businessSlug, pdfExportHref }: InvoiceDetailProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(status: InvoiceStatus) {
    startTransition(async () => {
      await updateInvoiceStatusAction(invoice.id, status);
    });
  }

  function handleSendEmail() {
    startTransition(async () => {
      await sendInvoiceEmailAction(invoice.id);
    });
  }

  const showActions = invoice.status !== "paid" && invoice.status !== "voided";

  return (
    <DashboardPage>
      {/* Two-column: invoice (left) + sidebar (right) on desktop; stacked on mobile */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        {/* ─── Mobile: Actions float above invoice ─── */}
        <div className="flex flex-col gap-3 xl:hidden print:hidden">
          {showActions && (
            <div className="flex flex-wrap gap-2">
              {invoice.status === "draft" && invoice.customerEmail && (
                <Button onClick={handleSendEmail} disabled={isPending} size="sm">
                  <Send className="size-3.5" data-icon="inline-start" />
                  Send invoice
                </Button>
              )}
              {invoice.status === "draft" && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("sent")}
                  disabled={isPending}
                  size="sm"
                >
                  <Mail className="size-3.5" data-icon="inline-start" />
                  Mark as sent
                </Button>
              )}
              {(invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue") && (
                <Button onClick={() => handleStatusChange("paid")} disabled={isPending} size="sm">
                  <CheckCircle className="size-3.5" data-icon="inline-start" />
                  Mark as paid
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={pdfExportHref} download>
                  <Download className="size-3.5" data-icon="inline-start" />
                  PDF
                </a>
              </Button>
              {isPending && <Spinner className="size-4 self-center" />}
            </div>
          )}
          {!showActions && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={pdfExportHref} download>
                  <Download className="size-3.5" data-icon="inline-start" />
                  Download PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-3.5" data-icon="inline-start" />
                Print
              </Button>
            </div>
          )}
        </div>
        {/* ─── Invoice document ─── */}
        <div className="min-w-0 rounded-2xl border bg-background shadow-sm print:border-0 print:rounded-none print:shadow-none">
          {/* Status */}
          <div className="px-5 pt-6 sm:px-8">
            <p className={`text-[0.6rem] font-black uppercase tracking-[0.2em] ${statusColors[invoice.status]}`}>
              {statusLabels[invoice.status]}
            </p>
          </div>

          {/* Business + Invoice number */}
          <div className="px-5 pt-5 pb-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              {/* From */}
              <div className="flex items-center gap-3">
                {invoice.businessLogoStoragePath && (
                  <Image
                    src={`/api/business/${invoice.businessSlug}/logo`}
                    alt={`${invoice.businessName} logo`}
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 rounded-lg border border-border/60 bg-background/50 object-cover shadow-sm"
                  />
                )}
                <div>
                  <p className="text-base font-bold tracking-tight text-foreground">
                    {invoice.businessName}
                  </p>
                  {invoice.businessContactEmail && (
                    <p className="text-xs text-muted-foreground">
                      {invoice.businessContactEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice number + date */}
              <div className="flex flex-col items-start gap-0.5 sm:items-end sm:text-right">
                <p className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                  {invoice.invoiceNumber}
                </p>
                {invoice.issuedAt && (
                  <p className="text-sm text-muted-foreground">
                    {formatDate(invoice.issuedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bill to + Due/Ref */}
          <div className="grid grid-cols-1 gap-4 border-t border-dashed px-5 py-5 sm:grid-cols-2 sm:px-8">
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Bill to
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {invoice.customerName}
              </p>
              {invoice.customerEmail && (
                <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>
              )}
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end sm:text-right">
              {invoice.dueAt && (
                <>
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Due date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatDate(invoice.dueAt)}
                  </p>
                </>
              )}
              {invoice.linkedQuoteNumber && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ref: {invoice.linkedQuoteNumber}
                </p>
              )}
            </div>
          </div>

          {/* Line items — stacked cards on mobile, table on sm+ */}
          <div className="border-t">
            {/* Mobile: stacked items */}
            <div className="divide-y divide-border/40 sm:hidden">
              <div className="bg-muted/40 px-5 py-3">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Items
                </p>
              </div>
              {invoice.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPriceInCents, invoice.currency)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-foreground">
                    {formatCurrency(item.lineTotalInCents, invoice.currency)}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-5 py-3.5 text-left text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground sm:px-8">
                    Item
                  </th>
                  <th className="px-3 py-3.5 text-center text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Qty
                  </th>
                  <th className="px-3 py-3.5 text-right text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Price
                  </th>
                  <th className="px-5 py-3.5 text-right text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground sm:px-8">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx < invoice.items.length - 1 ? "border-b border-border/40" : ""}
                  >
                    <td className="px-5 py-5 text-foreground sm:px-8">{item.description}</td>
                    <td className="px-3 py-5 text-center text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-5 text-right text-muted-foreground">
                      {formatCurrency(item.unitPriceInCents, invoice.currency)}
                    </td>
                    <td className="px-5 py-5 text-right font-bold text-foreground sm:px-8">
                      {formatCurrency(item.lineTotalInCents, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t bg-muted/20 px-5 py-6 sm:px-8">
            <div className="ml-auto flex w-full max-w-[260px] flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(invoice.subtotalInCents, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium">
                  −{formatCurrency(invoice.discountInCents, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">
                  {formatCurrency(invoice.taxInCents, invoice.currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-foreground/10 pt-3">
                <span className="text-lg font-black">Total</span>
                <span className="text-lg font-black">
                  {formatCurrency(invoice.totalInCents, invoice.currency)}
                </span>
              </div>
              {invoice.paidAt && (
                <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-semibold text-primary">
                  <CheckCircle className="size-3" />
                  Paid {formatDate(invoice.paidAt)}
                </div>
              )}
            </div>
          </div>

          {/* Terms */}
          {invoice.terms && (
            <div className="border-t px-5 py-5 sm:px-8">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Terms
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {invoice.terms}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t px-5 py-5 sm:px-8">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* ─── Sidebar: Actions + Tools (desktop only) ─── */}
        <div className="hidden flex-col gap-4 xl:flex print:hidden">
          {/* Actions */}
          {showActions && (
            <div className="rounded-xl border bg-background p-5 shadow-sm">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Actions
              </p>
              <div className="mt-3 flex flex-col gap-2.5">
                {invoice.status === "draft" && invoice.customerEmail && (
                  <Button onClick={handleSendEmail} disabled={isPending} className="w-full" size="sm">
                    <Send className="size-3.5" data-icon="inline-start" />
                    Send invoice
                  </Button>
                )}
                {invoice.status === "draft" && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("sent")}
                    disabled={isPending}
                    className="w-full"
                    size="sm"
                  >
                    <Mail className="size-3.5" data-icon="inline-start" />
                    Mark as sent
                  </Button>
                )}
                {(invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue") && (
                  <Button onClick={() => handleStatusChange("paid")} disabled={isPending} className="w-full" size="sm">
                    <CheckCircle className="size-3.5" data-icon="inline-start" />
                    Mark as paid
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => handleStatusChange("voided")}
                  disabled={isPending}
                  className="w-full text-muted-foreground hover:text-destructive"
                  size="sm"
                >
                  <XCircle className="size-3.5" data-icon="inline-start" />
                  Void
                </Button>
                {isPending && (
                  <div className="flex justify-center pt-1">
                    <Spinner className="size-4" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export tools */}
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Export
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={pdfExportHref} download>
                  <Download className="size-3.5" data-icon="inline-start" />
                  Download PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={() => window.print()}>
                <Printer className="size-3.5" data-icon="inline-start" />
                Print
              </Button>
            </div>
          </div>

          {/* Linked info */}
          {(invoice.linkedQuoteNumber || invoice.linkedJobTitle) && (
            <div className="rounded-xl border bg-background p-5 shadow-sm">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Linked
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {invoice.linkedQuoteNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quote</span>
                    <span className="font-medium">{invoice.linkedQuoteNumber}</span>
                  </div>
                )}
                {invoice.linkedJobTitle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Job</span>
                    <span className="font-medium">{invoice.linkedJobTitle}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardPage>
  );
}
