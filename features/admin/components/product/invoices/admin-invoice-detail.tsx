import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardDetailLayout,
  DashboardSection,
  DashboardSidebarStack,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAdminMoney,
  formatProductDate,
} from "@/features/admin/components/product/admin-product-format";
import {
  getAdminBusinessDetailPath,
  getAdminQuoteDetailPath,
} from "@/features/admin/navigation";
import type {
  AdminInvoiceDetail,
  AdminInvoiceDetailCore,
  AdminInvoiceItem,
  AdminInvoicePayment,
} from "@/features/admin/types";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import type { PaymentMethod } from "@/features/invoices/types";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
};

function formatDay(value: string): string {
  return formatProductDate(new Date(`${value}T00:00:00Z`));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="meta-label">{label}</dt>
      <dd className="mt-1 text-sm text-foreground break-words">{value}</dd>
    </div>
  );
}

function paymentVerdict(detail: AdminInvoiceDetailCore): string {
  if (detail.voidedAt) {
    return "Voided — no payment due.";
  }

  if (detail.balanceInCents === 0) {
    return "Paid in full.";
  }

  if (detail.paidInCents > 0) {
    return `${formatAdminMoney(detail.balanceInCents, detail.currency)} outstanding of ${formatAdminMoney(detail.totalInCents, detail.currency)}.`;
  }

  return `Unpaid — ${formatAdminMoney(detail.totalInCents, detail.currency)} due ${formatDay(detail.dueDate)}.`;
}

/**
 * Read-only admin detail view for an invoice.
 *
 * Leads with payment state — paid vs outstanding plus the recorded
 * manual payments — because that is the operational question support
 * asks first. Then amounts, line items, and the source quote. Passive
 * inspection only, no actions. Field clusters use flat `dl` rows and
 * rosters use `DashboardDetailFeed` — the same composition as the
 * business detail view.
 *
 * Thin composer over the section components below (kept so the detail
 * renders identically when the full payload is already in hand, e.g.
 * tests). Route pages stream each section behind its own Suspense
 * boundary instead.
 */
export function AdminInvoiceDetail({
  detail,
}: {
  detail: AdminInvoiceDetail;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminInvoiceHeaderSection detail={detail} />

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <AdminInvoicePaymentSection
            detail={detail}
            payments={detail.payments}
          />
          <AdminInvoiceAmountsSection detail={detail} />
          <AdminInvoiceItemsSection
            currency={detail.currency}
            items={detail.items}
          />
        </div>

        <AdminInvoiceMetaSidebar detail={detail} />
      </DashboardDetailLayout>
    </div>
  );
}

export function AdminInvoiceHeaderSection({
  detail,
}: {
  detail: AdminInvoiceDetailCore;
}) {
  return (
    <DashboardDetailHeader
      description={detail.title}
      meta={
        <>
          <InvoiceStatusBadge status={detail.status} />
          {detail.deletedAt ? (
            <Badge variant="destructive">Deleted</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatAdminMoney(detail.totalInCents, detail.currency)} ·{" "}
            {detail.business.name} · Due {formatDay(detail.dueDate)}
          </span>
        </>
      }
      title={detail.invoiceNumber}
    />
  );
}

export function AdminInvoicePaymentSection({
  detail,
  payments,
}: {
  detail: AdminInvoiceDetailCore;
  payments: AdminInvoicePayment[];
}) {
  return (
    <DashboardSection
      description="Manual payments recorded against this invoice."
      title="Payment"
    >
      <p className="text-sm font-medium text-foreground">
        {paymentVerdict(detail)}
      </p>
      {detail.voidedAt && detail.voidReason ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Void reason: {detail.voidReason}
        </p>
      ) : null}
      <dl className="mt-5 grid gap-5 sm:grid-cols-3">
        <DetailRow
          label="Paid"
          value={formatAdminMoney(detail.paidInCents, detail.currency)}
        />
        <DetailRow
          label="Balance due"
          value={formatAdminMoney(detail.balanceInCents, detail.currency)}
        />
        <DetailRow label="Due date" value={formatDay(detail.dueDate)} />
      </dl>
      <div className="mt-5">
        <h3 className="meta-label">Recorded payments ({payments.length})</h3>
        {payments.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No payments recorded for this invoice.
          </p>
        ) : (
          <DashboardDetailFeed className="mt-3">
            {payments.map((payment) => (
              <PaymentFeedItem
                currency={detail.currency}
                key={payment.id}
                payment={payment}
              />
            ))}
          </DashboardDetailFeed>
        )}
      </div>
    </DashboardSection>
  );
}

export function AdminInvoiceAmountsSection({
  detail,
}: {
  detail: AdminInvoiceDetailCore;
}) {
  return (
    <DashboardSection
      description={`Issued ${formatDay(detail.issueDate)} · due ${formatDay(detail.dueDate)}.`}
      title="Amounts"
    >
      <dl className="grid gap-5 sm:grid-cols-2">
        <DetailRow
          label="Subtotal"
          value={formatAdminMoney(detail.subtotalInCents, detail.currency)}
        />
        <DetailRow
          label="Discount"
          value={formatAdminMoney(detail.discountInCents, detail.currency)}
        />
        <DetailRow
          label="Tax"
          value={formatAdminMoney(detail.taxInCents, detail.currency)}
        />
        <DetailRow
          label="Total"
          value={formatAdminMoney(detail.totalInCents, detail.currency)}
        />
      </dl>
      {detail.notes || detail.paymentTerms ? (
        <div className="mt-5 flex min-w-0 flex-col gap-5">
          {detail.notes ? (
            <div className="min-w-0">
              <p className="meta-label">Customer notes</p>
              <p className="mt-1 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                {detail.notes}
              </p>
            </div>
          ) : null}
          {detail.paymentTerms ? (
            <div className="min-w-0">
              <p className="meta-label">Payment terms</p>
              <p className="mt-1 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                {detail.paymentTerms}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </DashboardSection>
  );
}

export function AdminInvoiceItemsSection({
  currency,
  items,
}: {
  currency: string;
  items: AdminInvoiceItem[];
}) {
  return (
    <DashboardSection
      description={`${items.length} line items in position order.`}
      title="Items"
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No line items on this invoice.
        </p>
      ) : (
        <DashboardTableContainer innerClassName="border-border/60">
          <Table className="min-w-[36rem]">
            <TableCaption className="sr-only">
              Invoice line items.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-[5rem] text-right">Qty</TableHead>
                <TableHead className="w-[8rem] text-right">Unit</TableHead>
                <TableHead className="w-[8rem] text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-full">
                    <span className="block truncate text-sm text-foreground">
                      {item.description}
                    </span>
                  </TableCell>
                  <TableCell className="w-[5rem] text-right text-sm tabular-nums text-muted-foreground">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="w-[8rem] text-right text-sm tabular-nums text-muted-foreground">
                    {formatAdminMoney(item.unitPriceInCents, currency)}
                  </TableCell>
                  <TableCell className="w-[8rem] text-right text-sm font-medium tabular-nums text-foreground">
                    {formatAdminMoney(item.lineTotalInCents, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DashboardTableContainer>
      )}
    </DashboardSection>
  );
}

export function AdminInvoiceMetaSidebar({
  detail,
}: {
  detail: AdminInvoiceDetailCore;
}) {
  return (
    <DashboardSidebarStack>
      <DashboardSection title="Customer">
        <dl className="flex flex-col gap-5">
          <DetailRow label="Name" value={detail.customerName} />
          <DetailRow label="Email" value={detail.customerEmail || "—"} />
          <DetailRow
            label="Contact"
            value={`${detail.customerContactMethod || "—"}${detail.customerContactHandle ? ` · ${detail.customerContactHandle}` : ""}`}
          />
        </dl>
      </DashboardSection>

      <DashboardSection title="Source quote">
        {detail.linkedQuote ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <QuoteStatusBadge status={detail.linkedQuote.status} />
            </div>
            <div>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={getAdminQuoteDetailPath(detail.linkedQuote.id)}
                  prefetch={true}
                >
                  Open {detail.linkedQuote.quoteNumber}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No linked quote — this invoice was created manually.
          </p>
        )}
      </DashboardSection>

      <DashboardSection title="Business">
        <dl className="flex flex-col gap-5">
          <DetailRow label="Name" value={detail.business.name} />
          <DetailRow label="Owner" value={detail.owner.email} />
        </dl>
        <Button asChild className="mt-5" size="sm" variant="outline">
          <Link
            href={getAdminBusinessDetailPath(detail.businessId)}
            prefetch={true}
          >
            Open business
          </Link>
        </Button>
      </DashboardSection>
    </DashboardSidebarStack>
  );
}

function PaymentFeedItem({
  currency,
  payment,
}: {
  currency: string;
  payment: AdminInvoicePayment;
}) {
  return (
    <DashboardDetailFeedItem
      meta={
        <>
          <span>{formatDay(payment.paymentDate)}</span>
          <span aria-hidden="true">·</span>
          <span>{paymentMethodLabels[payment.method] ?? payment.method}</span>
          {payment.reference ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="break-all">{payment.reference}</span>
            </>
          ) : null}
          {payment.createdByName ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Recorded by {payment.createdByName}</span>
            </>
          ) : null}
          {payment.voidedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <Badge variant="outline">Voided</Badge>
            </>
          ) : null}
        </>
      }
      title={formatAdminMoney(payment.amountInCents, currency)}
    >
      {payment.notes || payment.voidReason ? (
        <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap break-words">
          {[payment.notes, payment.voidReason && `Void reason: ${payment.voidReason}`]
            .filter(Boolean)
            .join("\n")}
        </p>
      ) : undefined}
    </DashboardDetailFeedItem>
  );
}
