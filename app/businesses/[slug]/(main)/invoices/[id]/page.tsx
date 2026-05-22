import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAppShellContext } from "@/lib/app-shell/context";
import { getInvoiceDetailForBusiness } from "@/features/invoices/queries";
import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const { businessContext } = await getAppShellContext(slug);
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
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { businessContext } = await getAppShellContext(slug);
  const invoice = await getInvoiceDetailForBusiness(
    businessContext.business.id,
    id,
  );

  if (!invoice) {
    notFound();
  }

  const pdfExportHref = `/api/business/${slug}/invoices/${invoice.id}/export`;

  return (
    <InvoiceDetail
      invoice={invoice}
      businessSlug={slug}
      pdfExportHref={pdfExportHref}
    />
  );
}
