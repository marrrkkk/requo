"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type {
  BillingCurrency,
  BillingProvider,
  PaymentAttemptStatus,
} from "@/lib/billing/types";
import type { RefundStatus } from "@/lib/db/schema/subscriptions";

type PaymentHistoryRecord = {
  id: string;
  createdAt: Date;
  amount: number;
  currency: BillingCurrency;
  provider: BillingProvider;
  status: PaymentAttemptStatus;
  providerPaymentId: string;
};

type RefundRecord = {
  id: string;
  paymentAttemptId: string;
  status: RefundStatus;
};

type PaymentHistoryTableProps = {
  records: PaymentHistoryRecord[];
  refunds?: RefundRecord[];
  refundWindowDays?: number;
};

export function PaymentHistoryTable({
  records,
  refunds = [],
  refundWindowDays = 30,
}: PaymentHistoryTableProps) {
  const router = useProgressRouter();
  const [isPending, startTransition] = useTransition();
  const [targetPayment, setTargetPayment] =
    useState<PaymentHistoryRecord | null>(null);
  const [reason, setReason] = useState("");

  const refundByPaymentId = useMemo(() => {
    const map = new Map<string, RefundRecord>();
    for (const refund of refunds) {
      const existing = map.get(refund.paymentAttemptId);
      // Prefer non-rejected refunds when multiple exist for one payment.
      if (
        !existing ||
        (existing.status === "rejected" && refund.status !== "rejected") ||
        (existing.status === "failed" && refund.status !== "failed")
      ) {
        map.set(refund.paymentAttemptId, refund);
      }
    }
    return map;
  }, [refunds]);

  const closeDialog = useCallback(() => {
    if (isPending) return;
    setTargetPayment(null);
    setReason("");
  }, [isPending]);

  const submitRefundRequest = useCallback(() => {
    if (!targetPayment) return;

    const paymentId = targetPayment.id;
    const trimmedReason = reason.trim();

    startTransition(async () => {
      try {
        const response = await fetch("/api/billing/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentAttemptId: paymentId,
            reason: trimmedReason || undefined,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          toast.error(
            payload.error ??
              "We couldn't submit your refund request. Please try again.",
          );
          return;
        }

        toast.success(
          "Refund requested. We'll update you once Paddle approves it.",
        );
        setTargetPayment(null);
        setReason("");
        router.refresh();
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }, [reason, router, startTransition, targetPayment]);

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
    <>
      <div className="rounded-xl border border-border/75 bg-card/97 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const refund = refundByPaymentId.get(record.id);
              const isRefundable = isEligibleForRefund({
                record,
                refund,
                refundWindowDays,
              });

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {record.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCurrency(record.amount, record.currency)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">Card</TableCell>
                  <TableCell>
                    <PaymentRowStatusBadge record={record} refund={refund} />
                  </TableCell>
                  <TableCell className="text-right">
                    {isRefundable ? (
                      <Button
                        disabled={isPending}
                        onClick={() => {
                          setTargetPayment(record);
                          setReason("");
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Request refund
                      </Button>
                    ) : refund ? (
                      <span className="text-xs text-muted-foreground">
                        {refund.status === "approved" ? "Refunded" : null}
                        {refund.status === "pending_approval"
                          ? "Awaiting approval"
                          : null}
                        {refund.status === "rejected" ? "Request rejected" : null}
                        {refund.status === "failed" ? "Request failed" : null}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={targetPayment !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a refund</DialogTitle>
            <DialogDescription>
              Your request is submitted to Paddle for approval. If approved,
              your subscription will cancel and access ends at the next
              billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {targetPayment ? (
              <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">Payment</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatCurrency(targetPayment.amount, targetPayment.currency)} on {" "}
                  {targetPayment.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            ) : null}
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-foreground">
                Reason (optional)
              </span>
              <Textarea
                disabled={isPending}
                maxLength={500}
                onChange={(event) => setReason(event.currentTarget.value)}
                placeholder="Let us know why you're requesting a refund."
                rows={3}
                value={reason}
              />
              <span className="text-xs text-muted-foreground">
                {reason.length} / 500
              </span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={closeDialog}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={submitRefundRequest}
              type="button"
            >
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Requesting...
                </>
              ) : (
                "Request refund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaymentRowStatusBadge({
  record,
  refund,
}: {
  record: PaymentHistoryRecord;
  refund: RefundRecord | undefined;
}) {
  if (refund) {
    switch (refund.status) {
      case "approved":
        return (
          <Badge
            variant="outline"
            className="border-border/80 text-muted-foreground"
          >
            Refunded
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge
            variant="outline"
            className="border-border/80 text-muted-foreground"
          >
            Refund pending
          </Badge>
        );
      case "rejected":
      case "failed":
        // Fall through to show the original payment status below.
        break;
    }
  }

  return <PaymentStatusBadge status={record.status} />;
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

function isEligibleForRefund({
  record,
  refund,
  refundWindowDays,
}: {
  record: PaymentHistoryRecord;
  refund: RefundRecord | undefined;
  refundWindowDays: number;
}): boolean {
  if (record.status !== "succeeded") return false;
  if (record.provider !== "paddle") return false;

  if (
    refund &&
    (refund.status === "pending_approval" || refund.status === "approved")
  ) {
    return false;
  }

  const windowMs = refundWindowDays * 24 * 60 * 60 * 1000;
  return Date.now() - record.createdAt.getTime() <= windowMs;
}

function formatCurrency(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}
