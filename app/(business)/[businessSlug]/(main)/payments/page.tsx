import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DashboardPage, DashboardSection, DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { DataListPagination } from "@/components/shared/data-list-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { DetailSectionFallback } from "@/components/shared/detail-section-fallback";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBusinessInvoicePath, getBusinessPaymentPath, getBusinessPaymentsPath } from "@/features/businesses/routes";
import { PaymentListFilters } from "@/features/invoices/components/payment-list-filters";
import { getPaymentListForBusiness } from "@/features/invoices/queries";
import { paymentListFiltersSchema } from "@/features/invoices/schemas";
import { formatQuoteMoney } from "@/features/invoices/utils";
import type { PaymentMethod } from "@/features/invoices/types";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type PaymentsPageProps = {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ITEMS_PER_PAGE = 20;

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  gcash: "GCash",
  maya: "Maya",
  check: "Check",
  other: "Other",
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "Payments",
  description: "Review payments recorded against invoices.",
});

export const instant = true;

export default function PaymentsPage({ params, searchParams }: PaymentsPageProps) {
  return (
    <DashboardPage>
      <PageHeader title="Payments" description="Payments you record against invoices will appear here." />
      <div className="dashboard-table-shell" data-list-card>
        <RegionErrorBoundary fallback={<DetailSectionFallback rows={2} />}>
          <Suspense fallback={<DetailSectionFallback rows={2} />}>
            <PaymentsControlsRegion params={params} searchParams={searchParams} />
          </Suspense>
        </RegionErrorBoundary>
        <RegionErrorBoundary fallback={<DetailSectionFallback rows={4} />}>
          <Suspense fallback={<DetailSectionFallback rows={4} />}>
            <PaymentsListRegion params={params} searchParams={searchParams} />
          </Suspense>
        </RegionErrorBoundary>
      </div>
    </DashboardPage>
  );
}

async function PaymentsControlsRegion({ params, searchParams }: PaymentsPageProps) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const parsed = paymentListFiltersSchema.safeParse(await searchParams);
  const filters = parsed.success
    ? { q: parsed.data.q, status: parsed.data.status, method: parsed.data.method, from: parsed.data.from, to: parsed.data.to, page: parsed.data.page }
    : { q: undefined, status: "all" as const, method: "all" as const, from: undefined, to: undefined, page: 1 };
  const { total } = await getPaymentListForBusiness({ businessId: businessContext.business.id, filters, page: 1, pageSize: 1 });
  return <PaymentListFilters filters={filters} resultCount={total} />;
}

async function PaymentsListRegion({ params, searchParams }: PaymentsPageProps) {
  const { businessSlug } = await params;
  const query = await searchParams;
  const { businessContext } = await getAppShellContext(businessSlug);
  const parsed = paymentListFiltersSchema.safeParse(query);
  const filters = parsed.success
    ? { q: parsed.data.q, status: parsed.data.status, method: parsed.data.method, from: parsed.data.from, to: parsed.data.to, page: parsed.data.page }
    : { q: undefined, status: "all" as const, method: "all" as const, from: undefined, to: undefined, page: 1 };
  const page = Math.max(1, filters.page);
  const { items, total } = await getPaymentListForBusiness({ businessId: businessContext.business.id, filters, page, pageSize: ITEMS_PER_PAGE });

  if (!items.length) {
    return (
      <DashboardSection title="No payments recorded yet.">
        <p className="text-sm text-muted-foreground">
          Payments you record against invoices will appear here.
        </p>
      </DashboardSection>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="flex flex-col gap-4">
      <DashboardTableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recorded by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link className="font-medium underline underline-offset-4" href={getBusinessPaymentPath(businessSlug, item.id)}>
                    {item.paymentNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link className="underline underline-offset-4" href={getBusinessInvoicePath(businessSlug, item.invoiceId)}>
                    {item.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{item.customerName}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatQuoteMoney(item.amountInCents, item.currency)}
                </TableCell>
                <TableCell>{methodLabels[item.method]}</TableCell>
                <TableCell>{item.paymentDate}</TableCell>
                <TableCell>{item.status === "recorded" ? "Recorded" : "Voided"}</TableCell>
                <TableCell className="text-muted-foreground">{item.recordedByName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DashboardTableContainer>
      {totalPages > 1 ? (
        <DataListPagination
          currentPage={page}
          pathname={getBusinessPaymentsPath(businessSlug)}
          searchParams={query as Record<string, string | string[] | undefined>}
          totalItems={total}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}
