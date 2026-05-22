"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  BillingCurrency,
  BillingProvider,
  PaymentAttemptStatus,
} from "@/lib/billing/types";

type PaymentHistoryRecord = {
  id: string;
  createdAt: Date;
  amount: number;
  currency: BillingCurrency;
  provider: BillingProvider;
  status: PaymentAttemptStatus;
  providerPaymentId: string;
  /** e.g. "Visa •••• 4242" or "Card" as fallback */
  paymentMethodLabel?: string;
};

type PaymentHistoryTableProps = {
  records: PaymentHistoryRecord[];
};

/**
 * Read-only payment history. Cancel and refund actions live in the
 * Polar customer portal post-refactor; this table just surfaces what
 * Requo recorded from `payment_attempts`.
 */
export function PaymentHistoryTable({ records }: PaymentHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 border-dashed bg-muted/10 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No payment history</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your invoices and past payments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/75 bg-card/97 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Payment ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium text-muted-foreground">
                {record.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">
                {record.provider}
              </TableCell>
              <TableCell
                className="font-mono text-xs text-muted-foreground truncate max-w-[220px]"
                title={record.providerPaymentId}
              >
                {record.providerPaymentId}
              </TableCell>
              <TableCell className="font-semibold text-foreground">
                {formatCurrency(record.amount, record.currency)}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={record.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentAttemptStatus }) {
  switch (status) {
    case "succeeded":
      return (
        <Badge
          variant="secondary"
          className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-400"
        >
          Paid
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-muted-foreground border-border/80">
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="destructive"
          className="border-destructive/20 bg-destructive/10 text-destructive"
        >
          Failed
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="opacity-80">
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatCurrency(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}
