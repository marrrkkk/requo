"use client";

import { RequoIcon } from "@/components/shared/requo-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types for structured tool outputs
// ---------------------------------------------------------------------------

export type InquiryListItem = {
  id: string;
  customerName: string;
  serviceCategory: string;
  status: string;
  submittedAt: string;
  url: string;
};

export type QuoteListItem = {
  id: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  total: string;
  status: string;
  url: string;
};

export type InquiryDetail = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerContact: string;
  serviceCategory: string;
  status: string;
  submittedAt: string;
  budget: string | null;
  subject: string | null;
  url: string;
};

export type QuoteDetail = {
  id: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  total: string;
  status: string;
  validUntil: string;
  sentAt: string | null;
  url: string;
  items: { description: string; quantity: number; unitPrice: string; lineTotal: string }[];
};

export type JobListItem = {
  id: string;
  title: string;
  customerName: string;
  status: string;
  total: string;
  progress: string;
  createdAt: string;
  url: string;
};

export type JobDetail = {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  total: string;
  quoteNumber: string;
  startedAt: string | null;
  completedAt: string | null;
  url: string;
  items: { description: string; quantity: number; unitPrice: string; lineTotal: string; completed: boolean }[];
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  total: string;
  status: string;
  dueAt: string | null;
  url: string;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  title: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  total: string;
  issuedAt: string | null;
  dueAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  url: string;
  items: { description: string; quantity: number; unitPrice: string; lineTotal: string }[];
};

// Type guard helpers
export type StructuredToolOutput =
  | { _type: "inquiry_list"; items: InquiryListItem[] }
  | { _type: "quote_list"; items: QuoteListItem[] }
  | { _type: "inquiry_detail"; data: InquiryDetail }
  | { _type: "quote_detail"; data: QuoteDetail }
  | { _type: "job_list"; items: JobListItem[] }
  | { _type: "job_detail"; data: JobDetail }
  | { _type: "invoice_list"; items: InvoiceListItem[] }
  | { _type: "invoice_detail"; data: InvoiceDetail };

export function isStructuredToolOutput(value: unknown): value is StructuredToolOutput {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    typeof (value as { _type: unknown })._type === "string"
  );
}

// ---------------------------------------------------------------------------
// Status badge colors
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  waiting: "secondary",
  quoted: "secondary",
  won: "default",
  lost: "destructive",
  overdue: "destructive",
  archived: "outline",
  draft: "outline",
  sent: "secondary",
  viewed: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "destructive",
  voided: "outline",
  // Jobs
  todo: "outline",
  in_progress: "secondary",
  done: "default",
  // Invoices
  paid: "default",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="text-[0.65rem] capitalize">
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Inquiry List Card
// ---------------------------------------------------------------------------

function InquiryListCard({ items }: { items: InquiryListItem[] }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
        >
          <RequoIcon className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {item.customerName}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.serviceCategory} · {item.submittedAt}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quote List Card
// ---------------------------------------------------------------------------

function QuoteListCard({ items }: { items: QuoteListItem[] }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
        >
          <RequoIcon className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {item.quoteNumber}
              </span>
              <span className="truncate text-muted-foreground">&ldquo;{item.title}&rdquo;</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.customerName} · {item.total}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inquiry Detail Card
// ---------------------------------------------------------------------------

function InquiryDetailCard({ data }: { data: InquiryDetail }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <RequoIcon className="size-4 text-primary" />
        <span className="font-medium text-foreground">{data.customerName}</span>
        <StatusBadge status={data.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>Service: <span className="text-foreground">{data.serviceCategory}</span></div>
        <div>Submitted: <span className="text-foreground">{data.submittedAt}</span></div>
        {data.customerEmail && <div>Email: <span className="text-foreground">{data.customerEmail}</span></div>}
        {data.budget && <div>Budget: <span className="text-foreground">{data.budget}</span></div>}
        {data.subject && <div className="col-span-2">Subject: <span className="text-foreground">{data.subject}</span></div>}
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Quote Detail Card
// ---------------------------------------------------------------------------

function QuoteDetailCard({ data }: { data: QuoteDetail }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <RequoIcon className="size-4 text-primary" />
        <span className="font-medium text-foreground">{data.quoteNumber}</span>
        <span className="text-muted-foreground">&ldquo;{data.title}&rdquo;</span>
        <StatusBadge status={data.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>Customer: <span className="text-foreground">{data.customerName}</span></div>
        <div>Total: <span className="font-medium text-foreground">{data.total}</span></div>
        <div>Valid until: <span className="text-foreground">{data.validUntil}</span></div>
        <div>Sent: <span className="text-foreground">{data.sentAt ?? "Not sent"}</span></div>
      </div>
      {data.items.length > 0 && (
        <div className="mt-3 border-t border-border/40 pt-2">
          <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Line items</div>
          <div className="mt-1 space-y-0.5">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{item.description}</span>
                <span className="shrink-0 text-muted-foreground">{item.quantity}× {item.unitPrice} = {item.lineTotal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Job List Card
// ---------------------------------------------------------------------------

function JobListCard({ items }: { items: JobListItem[] }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
        >
          <RequoIcon className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {item.title}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.customerName} · {item.total} · {item.progress}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job Detail Card
// ---------------------------------------------------------------------------

function JobDetailCard({ data }: { data: JobDetail }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <RequoIcon className="size-4 text-primary" />
        <span className="font-medium text-foreground">{data.title}</span>
        <StatusBadge status={data.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>Customer: <span className="text-foreground">{data.customerName}</span></div>
        <div>Total: <span className="font-medium text-foreground">{data.total}</span></div>
        <div>Quote: <span className="text-foreground">{data.quoteNumber}</span></div>
        {data.startedAt && <div>Started: <span className="text-foreground">{data.startedAt}</span></div>}
        {data.completedAt && <div>Completed: <span className="text-foreground">{data.completedAt}</span></div>}
      </div>
      {data.items.length > 0 && (
        <div className="mt-3 border-t border-border/40 pt-2">
          <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Items</div>
          <div className="mt-1 space-y-0.5">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className={cn("truncate", item.completed && "line-through text-muted-foreground")}>{item.description}</span>
                <span className="shrink-0 text-muted-foreground">{item.lineTotal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Invoice List Card
// ---------------------------------------------------------------------------

function InvoiceListCard({ items }: { items: InvoiceListItem[] }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50"
        >
          <RequoIcon className="size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {item.invoiceNumber}
              </span>
              <span className="truncate text-muted-foreground">&ldquo;{item.title}&rdquo;</span>
              <StatusBadge status={item.status} />
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.customerName} · {item.total}{item.dueAt ? ` · Due ${item.dueAt}` : ""}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Card
// ---------------------------------------------------------------------------

function InvoiceDetailCard({ data }: { data: InvoiceDetail }) {
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <RequoIcon className="size-4 text-primary" />
        <span className="font-medium text-foreground">{data.invoiceNumber}</span>
        <span className="text-muted-foreground">&ldquo;{data.title}&rdquo;</span>
        <StatusBadge status={data.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>Customer: <span className="text-foreground">{data.customerName}</span></div>
        <div>Total: <span className="font-medium text-foreground">{data.total}</span></div>
        {data.issuedAt && <div>Issued: <span className="text-foreground">{data.issuedAt}</span></div>}
        {data.dueAt && <div>Due: <span className="text-foreground">{data.dueAt}</span></div>}
        {data.sentAt && <div>Sent: <span className="text-foreground">{data.sentAt}</span></div>}
        {data.paidAt && <div>Paid: <span className="text-foreground">{data.paidAt}</span></div>}
      </div>
      {data.items.length > 0 && (
        <div className="mt-3 border-t border-border/40 pt-2">
          <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Line items</div>
          <div className="mt-1 space-y-0.5">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{item.description}</span>
                <span className="shrink-0 text-muted-foreground">{item.quantity}× {item.unitPrice} = {item.lineTotal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export function StructuredDataCard({ output }: { output: StructuredToolOutput }) {
  switch (output._type) {
    case "inquiry_list":
      return <InquiryListCard items={output.items} />;
    case "quote_list":
      return <QuoteListCard items={output.items} />;
    case "inquiry_detail":
      return <InquiryDetailCard data={output.data} />;
    case "quote_detail":
      return <QuoteDetailCard data={output.data} />;
    case "job_list":
      return <JobListCard items={output.items} />;
    case "job_detail":
      return <JobDetailCard data={output.data} />;
    case "invoice_list":
      return <InvoiceListCard items={output.items} />;
    case "invoice_detail":
      return <InvoiceDetailCard data={output.data} />;
    default:
      return null;
  }
}
