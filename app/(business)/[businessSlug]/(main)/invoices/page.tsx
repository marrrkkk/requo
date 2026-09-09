import Link from "next/link";
import { Suspense } from "react";
import { ReceiptText } from "lucide-react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getAppShellContext } from "@/lib/app-shell/context";
import { getBusinessNewInvoicePath } from "@/features/businesses/routes";
import { getInvoiceListForBusiness } from "@/features/invoices/queries";
import { InvoiceList } from "@/features/invoices/components/invoice-list";
import { InvoiceListFilters } from "@/features/invoices/components/invoice-list-filters";
import type { InvoiceStatus } from "@/features/invoices/types";

export const instant = true;

export default function InvoicesPage({ params, searchParams }: { params: Promise<{ businessSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DashboardPage><PageHeader title="Invoices" actions={<Suspense fallback={<div className="h-9 w-32 animate-pulse rounded-md bg-muted/40" />}><InvoiceHeaderAction params={params} /></Suspense>} /><Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted/40" />}><InvoiceListRegion params={params} searchParams={searchParams} /></Suspense></DashboardPage>;
}

async function InvoiceHeaderAction({ params }: { params: Promise<{ businessSlug: string }> }) {
  const { businessSlug } = await params;
  return <Button asChild><Link href={getBusinessNewInvoicePath(businessSlug)}><ReceiptText data-icon="inline-start" />New invoice</Link></Button>;
}

async function InvoiceListRegion({ params, searchParams }: { params: Promise<{ businessSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ businessSlug }, query] = await Promise.all([params, searchParams]);
  const { businessContext } = await getAppShellContext(businessSlug);
  const q = typeof query.q === "string" ? query.q : "";
  const rawStatus = typeof query.status === "string" ? query.status : "all";
  const statuses: Array<"all" | InvoiceStatus> = ["all", "draft", "sent", "unpaid", "partially_paid", "paid", "overdue", "voided"];
  const status = statuses.includes(rawStatus as never) ? (rawStatus as "all" | InvoiceStatus) : "all";
  const items = await getInvoiceListForBusiness({ businessId: businessContext.business.id, filters: { q, status, page: 1 }, page: 1, pageSize: 100 });
  return <div className="flex flex-col gap-4"><InvoiceListFilters filters={{ q, status }} resultCount={items.length} /><InvoiceList businessSlug={businessSlug} items={items} /></div>;
}
