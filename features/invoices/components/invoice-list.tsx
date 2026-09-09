import Link from "next/link";
import { ReceiptText } from "lucide-react";

import { DashboardEmptyState, DashboardTableContainer } from "@/components/shared/dashboard-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import type { InvoiceListItem } from "@/features/invoices/types";
import { formatQuoteMoney } from "@/features/invoices/utils";
import { getBusinessInvoicePath } from "@/features/businesses/routes";

export function InvoiceList({ businessSlug, items }: { businessSlug: string; items: InvoiceListItem[] }) {
  if (!items.length) return <DashboardEmptyState icon={ReceiptText} title="No invoices yet" description="Create an invoice from an accepted quote to start tracking payments." variant="list" />;
  return <DashboardTableContainer><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Issue date</TableHead><TableHead>Due date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{items.map((invoice) => <TableRow key={invoice.id}><TableCell><Link className="font-medium hover:underline" href={getBusinessInvoicePath(businessSlug, invoice.id)}>{invoice.invoiceNumber}</Link><div className="text-xs text-muted-foreground">{invoice.title}</div></TableCell><TableCell>{invoice.customerName}</TableCell><TableCell>{invoice.issueDate}</TableCell><TableCell>{invoice.dueDate}</TableCell><TableCell className="text-right tabular-nums">{formatQuoteMoney(invoice.totalInCents, invoice.currency)}</TableCell><TableCell className="text-right font-medium tabular-nums">{formatQuoteMoney(invoice.balanceInCents, invoice.currency)}</TableCell><TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell></TableRow>)}</TableBody></Table></DashboardTableContainer>;
}
