import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardDetailLayout,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatAdminMoney,
  formatFileSize,
} from "@/features/admin/components/product/admin-product-format";
import {
  getAdminBusinessDetailPath,
  getAdminQuoteDetailPath,
} from "@/features/admin/navigation";
import type {
  AdminInquiryAttachment,
  AdminInquiryDetail,
  AdminInquiryDetailCore,
  AdminInquiryLinkedQuote,
  AdminInquiryMessage,
  AdminInquiryNote,
} from "@/features/admin/types";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import {
  inquirySourceLabels,
  normalizeInquirySource,
} from "@/features/inquiries/types";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: Date | null): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="meta-label">{label}</dt>
      <dd className="mt-1 text-sm text-foreground break-words">{value}</dd>
    </div>
  );
}

function qualificationLabel(detail: AdminInquiryDetailCore): string {
  const parts = [
    detail.qualificationTemperature
      ? detail.qualificationTemperature.charAt(0).toUpperCase() +
        detail.qualificationTemperature.slice(1)
      : null,
    detail.qualificationScore === null
      ? null
      : `score ${detail.qualificationScore}`,
  ].filter(Boolean);

  return parts.join(" · ") || "—";
}

/**
 * Read-only admin detail view for an inquiry.
 *
 * Identity, request content, conversation messages, owner notes,
 * attachment metadata, and linked quotes — passive inspection only, no
 * actions. Attachments are metadata only: the query never selects
 * `storagePath`, so there is nothing here that could leak a private
 * asset URL. Field clusters use flat `dl` rows and rosters use
 * `DashboardDetailFeed` — the same composition as the business detail
 * view.
 *
 * Thin composer over the section components below (kept so the detail
 * renders identically when the full payload is already in hand, e.g.
 * tests). Route pages stream each section behind its own Suspense
 * boundary instead.
 */
export function AdminInquiryDetail({
  detail,
}: {
  detail: AdminInquiryDetail;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminInquiryHeaderSection detail={detail} />

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <AdminInquiryRequestSection detail={detail} />
          <AdminInquiryMessagesSection
            customerName={detail.customerName}
            messages={detail.messages}
          />
          <AdminInquiryNotesSection notes={detail.notes} />
          <AdminInquiryAttachmentsSection attachments={detail.attachments} />
          <AdminInquiryLinkedQuotesSection linkedQuotes={detail.linkedQuotes} />
        </div>

        <AdminInquiryMetaSidebar detail={detail} />
      </DashboardDetailLayout>
    </div>
  );
}

export function AdminInquiryHeaderSection({
  detail,
}: {
  detail: AdminInquiryDetailCore;
}) {
  const title = detail.subject?.trim() || `Inquiry from ${detail.customerName}`;

  return (
    <DashboardDetailHeader
      meta={
        <>
          <InquiryStatusBadge status={detail.status} />
          {detail.aiAssisted ? (
            <Badge variant="secondary">AI assisted</Badge>
          ) : null}
          {detail.escalated ? (
            <Badge variant="destructive">Escalated</Badge>
          ) : null}
          {detail.archivedAt ? (
            <Badge variant="outline">Archived</Badge>
          ) : null}
          {detail.deletedAt ? (
            <Badge variant="destructive">Deleted</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {detail.business.name} · Submitted{" "}
            {formatDate(detail.submittedAt)}
          </span>
        </>
      }
      title={title}
    />
  );
}

export function AdminInquiryRequestSection({
  detail,
}: {
  detail: AdminInquiryDetailCore;
}) {
  return (
    <DashboardSection
      description="What the customer asked for, as submitted."
      title="Request"
    >
      <dl className="grid gap-5 sm:grid-cols-2">
        <DetailRow
          label="Service category"
          value={detail.serviceCategory || "—"}
        />
        <DetailRow label="Budget" value={detail.budgetText || "—"} />
        <DetailRow
          label="Requested deadline"
          value={detail.requestedDeadline || "—"}
        />
        <DetailRow
          label="Source"
          value={inquirySourceLabels[normalizeInquirySource(detail.source)]}
        />
        <DetailRow
          label="Quote requested"
          value={detail.quoteRequested ? "Yes" : "No"}
        />
        <DetailRow
          label="Qualification"
          value={qualificationLabel(detail)}
        />
      </dl>
      <div className="mt-5 min-w-0">
        <p className="meta-label">Details</p>
        <p className="mt-1 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
          {detail.details}
        </p>
      </div>
    </DashboardSection>
  );
}

export function AdminInquiryMessagesSection({
  customerName,
  messages,
}: {
  customerName: string;
  messages: AdminInquiryMessage[];
}) {
  return (
    <DashboardSection
      description="Conversation history on this inquiry, oldest first."
      title={`Messages (${messages.length})`}
    >
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages recorded.
        </p>
      ) : (
        <DashboardDetailFeed>
          {messages.map((message) => (
            <DashboardDetailFeedItem
              key={message.id}
              meta={
                <>
                  <span className="capitalize">{message.role}</span>
                  {message.status !== "completed" ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{message.status}</span>
                    </>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span>{formatDateTime(message.createdAt)}</span>
                </>
              }
              title={message.role === "user" ? customerName : "Assistant"}
              titleLines={1}
            >
              <p className="text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </DashboardDetailFeedItem>
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}

export function AdminInquiryNotesSection({
  notes,
}: {
  notes: AdminInquiryNote[];
}) {
  return (
    <DashboardSection
      description="Internal owner notes, oldest first."
      title={`Notes (${notes.length})`}
    >
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes recorded.
        </p>
      ) : (
        <DashboardDetailFeed>
          {notes.map((note) => (
            <DashboardDetailFeedItem
              key={note.id}
              meta={
                <>
                  <span>
                    {note.authorName || note.authorEmail || "Unknown author"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDateTime(note.createdAt)}</span>
                </>
              }
              title="Owner note"
            >
              <p className="text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                {note.body}
              </p>
            </DashboardDetailFeedItem>
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}

export function AdminInquiryAttachmentsSection({
  attachments,
}: {
  attachments: AdminInquiryAttachment[];
}) {
  return (
    <DashboardSection
      description="File metadata only — downloads stay inside the business dashboard."
      title={`Attachments (${attachments.length})`}
    >
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No attachments.
        </p>
      ) : (
        <DashboardDetailFeed>
          {attachments.map((attachment) => (
            <DashboardDetailFeedItem
              key={attachment.id}
              meta={
                <>
                  <span>{attachment.contentType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatFileSize(attachment.fileSize)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDateTime(attachment.createdAt)}</span>
                </>
              }
              title={attachment.fileName}
            />
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}

export function AdminInquiryLinkedQuotesSection({
  linkedQuotes,
}: {
  linkedQuotes: AdminInquiryLinkedQuote[];
}) {
  return (
    <DashboardSection
      description="Quotes drafted from this inquiry."
      title={`Linked quotes (${linkedQuotes.length})`}
    >
      {linkedQuotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quotes drafted from this inquiry yet.
        </p>
      ) : (
        <DashboardDetailFeed>
          {linkedQuotes.map((quote) => (
            <DashboardDetailFeedItem
              action={
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={getAdminQuoteDetailPath(quote.id)}
                    prefetch={true}
                  >
                    Open
                  </Link>
                </Button>
              }
              key={quote.id}
              meta={
                <>
                  <QuoteStatusBadge status={quote.status} />
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatAdminMoney(quote.totalInCents, quote.currency)}
                  </span>
                  {quote.sentAt ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Sent {formatDate(quote.sentAt)}</span>
                    </>
                  ) : null}
                </>
              }
              title={quote.quoteNumber}
            />
          ))}
        </DashboardDetailFeed>
      )}
    </DashboardSection>
  );
}

export function AdminInquiryMetaSidebar({
  detail,
}: {
  detail: AdminInquiryDetailCore;
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

      <DashboardSection title="Business">
        <dl className="flex flex-col gap-5">
          <DetailRow label="Name" value={detail.business.name} />
          <DetailRow label="Owner" value={detail.owner.email} />
        </dl>
        <Button asChild className="mt-5" size="sm" variant="outline">
          <Link
            href={getAdminBusinessDetailPath(detail.business.id)}
            prefetch={true}
          >
            Open business
          </Link>
        </Button>
      </DashboardSection>

      <DashboardSection title="Activity">
        <dl className="flex flex-col gap-5">
          <DetailRow
            label="Submitted"
            value={formatDateTime(detail.submittedAt)}
          />
          <DetailRow
            label="Last responded"
            value={
              detail.lastRespondedAt
                ? formatDateTime(detail.lastRespondedAt)
                : "No response yet"
            }
          />
        </dl>
      </DashboardSection>
    </DashboardSidebarStack>
  );
}
