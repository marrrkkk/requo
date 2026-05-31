"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  updateJobStatusAction,
  toggleJobItemAction,
} from "@/features/jobs/actions";
import { createInvoiceFromJobAction } from "@/features/invoices/actions";
import {
  getBusinessInvoicePath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import { useProgressRouter } from "@/hooks/use-progress-router";
import type { DashboardJobDetail, DashboardJobItem, JobStatus } from "@/features/jobs/types";

type JobDetailProps = {
  job: DashboardJobDetail;
  businessSlug: string;
  existingInvoiceId?: string | null;
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

const statusLabels: Record<JobStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const statusVariants: Record<JobStatus, "secondary" | "default" | "outline"> = {
  todo: "secondary",
  in_progress: "default",
  done: "outline",
};

export function JobDetail({
  job,
  businessSlug,
  existingInvoiceId,
}: JobDetailProps) {
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();
  const router = useProgressRouter();
  const { runMutation } = useOptimisticMutation();

  // Optimistic items for instant checkbox toggling
  const [optimisticItems, toggleOptimisticItem] = useOptimistic(
    job.items,
    (currentItems: DashboardJobItem[], toggledId: string) =>
      currentItems.map((item) =>
        item.id === toggledId
          ? { ...item, completedAt: item.completedAt ? null : new Date() }
          : item,
      ),
  );

  const completedCount = optimisticItems.filter((i) => i.completedAt).length;
  const totalItems = optimisticItems.length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  const allComplete = completedCount === totalItems && totalItems > 0;

  function handleStatusChange(status: JobStatus) {
    startStatusTransition(async () => {
      await updateJobStatusAction(job.id, status);
    });
  }

  function handleToggleItem(itemId: string) {
    runMutation({
      applyOptimistic: () => {
        toggleOptimisticItem(itemId);
      },
      revertOptimistic: () => {
        toggleOptimisticItem(itemId);
      },
      mutation: () => toggleJobItemAction(job.id, itemId),
      pendingKey: `toggle-${itemId}`,
    });
  }

  function handleGenerateInvoice() {
    startInvoiceTransition(async () => {
      const result = await createInvoiceFromJobAction(job.id);
      if (result.invoiceId) {
        router.push(getBusinessInvoicePath(businessSlug, result.invoiceId));
      }
    });
  }

  function handleOpenInvoice() {
    if (existingInvoiceId) {
      router.push(getBusinessInvoicePath(businessSlug, existingInvoiceId));
    }
  }

  return (
    <DashboardPage>
      <PageHeader
        title={job.title}
        actions={
          <Badge variant={statusVariants[job.status]}>
            {statusLabels[job.status]}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Work items with progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Work items</span>
                <span className="text-sm font-normal tabular-nums text-muted-foreground">
                  {completedCount}/{totalItems} complete
                </span>
              </CardTitle>
              <Progress value={progressPercent} className="mt-2 h-1.5" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col divide-y">
                {optimisticItems.map((item) => {
                  const isChecked = Boolean(item.completedAt);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className="flex items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-accent/40 first:pt-0 last:pb-0"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="size-[1.125rem] shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="size-[1.125rem] shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={`flex-1 text-sm ${isChecked ? "text-muted-foreground line-through" : "text-foreground"}`}
                      >
                        {item.description}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unitPriceInCents, job.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {job.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{job.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quote</span>
                <Link
                  href={getBusinessQuotePath(businessSlug, job.quoteId)}
                  className="font-medium text-primary hover:underline"
                >
                  {job.quoteNumber}
                </Link>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">
                  {formatCurrency(job.totalInCents, job.currency)}
                </span>
              </div>
              {job.startedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Started</span>
                  <span>{job.startedAt.toLocaleDateString()}</span>
                </div>
              )}
              {job.completedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{job.completedAt.toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {job.status === "todo" && (
              <Button
                onClick={() => handleStatusChange("in_progress")}
                disabled={isStatusPending}
                className="w-full"
              >
                {isStatusPending ? (
                  <Spinner className="size-4" aria-hidden="true" />
                ) : null}
                Start job
              </Button>
            )}
            {job.status === "in_progress" && (
              <Button
                onClick={() => handleStatusChange("done")}
                disabled={isStatusPending || !allComplete}
                className="w-full"
              >
                {isStatusPending ? (
                  <Spinner className="size-4" aria-hidden="true" />
                ) : (
                  <CheckCircle2 data-icon="inline-start" />
                )}
                Mark complete
              </Button>
            )}
            {job.status === "done" && existingInvoiceId ? (
              <Button
                onClick={handleOpenInvoice}
                className="w-full"
                variant="outline"
              >
                <Receipt data-icon="inline-start" />
                Open invoice
              </Button>
            ) : null}
            {job.status === "done" && !existingInvoiceId && (
              <Button
                onClick={handleGenerateInvoice}
                disabled={isInvoicePending}
                className="w-full"
              >
                {isInvoicePending ? (
                  <Spinner className="size-4" aria-hidden="true" />
                ) : (
                  <Receipt data-icon="inline-start" />
                )}
                Generate invoice
              </Button>
            )}
            {job.status === "in_progress" && !allComplete && (
              <p className="text-center text-xs text-muted-foreground">
                Complete all items to finish the job
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
