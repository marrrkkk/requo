import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAppShellContext } from "@/lib/app-shell/context";
import { getInvoiceDetailForBusiness } from "@/features/invoices/queries";
import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string; id: string }>;
}): Promise<Metadata> {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailForBusiness(
    businessContext.business.id,
    id,
  );

  return {
    title: invoice ? `${invoice.invoiceNumber} · ${invoice.title}` : "Invoice not found",
  };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ businessSlug: string; id: string }>;
}) {
  const { businessSlug, id } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);
  const invoice = await getInvoiceDetailForBusiness(
    businessContext.business.id,
    id,
  );

  if (!invoice) {
    notFound();
  }

  const pdfExportHref = `/api/business/${businessSlug}/invoices/${invoice.id}/export`;

  return (
    <InvoiceDetail
      invoice={invoice}
      businessSlug={businessSlug}
      pdfExportHref={pdfExportHref}
    />
  );
}
