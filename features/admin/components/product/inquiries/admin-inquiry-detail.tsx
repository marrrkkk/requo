import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardDetailLayout,
  DashboardMetaPill,
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
  ADMIN_BUSINESSES_PATH,
  ADMIN_INQUIRIES_PATH,
  getAdminBusinessDetailPath,
  getAdminQuoteDetailPath,
  getAdminUserDetailPath,
} from "@/features/admin/navigation";
import type { AdminInquiryDetail } from "@/features/admin/types";
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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div data-padding="none" className="soft-panel px-4 py-3 shadow-none">
      <p className="meta-label">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-foreground break-words">
        {value}
      </p>
    </div>
  );
}

/**
 * Read-only admin detail view for an inquiry.
 *
 * Identity, request content, conversation messages, owner notes,
 * attachment metadata, and linked quotes — passive inspection only, no
 * customer-facing editing. Attachments are metadata only: the query never
 * selects `storagePath`, so there is nothing here that could leak a
 * private asset URL.
 */
export function AdminInquiryDetail({
  detail,
}: {
  detail: AdminInquiryDetail;
}) {
  const title = detail.subject?.trim() || `Inquiry from ${detail.customerName}`;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardDetailHeader
        eyebrow={
          <Link
            className="underline-offset-4 hover:text-primary hover:underline"
            href={ADMIN_INQUIRIES_PATH}
          >
            ← Inquiries
          </Link>
        }
        meta={
          <>
            <DashboardMetaPill>
              <InquiryStatusBadge status={detail.status} />
            </DashboardMetaPill>
            <DashboardMetaPill>{detail.business.name}</DashboardMetaPill>
            <DashboardMetaPill>
              Submitted {formatDate(detail.submittedAt)}
            </DashboardMetaPill>
            {detail.archivedAt ? (
              <DashboardMetaPill>
                Archived {formatDate(detail.archivedAt)}
              </DashboardMetaPill>
            ) : null}
            {detail.deletedAt ? (
              <DashboardMetaPill>
                Deleted {formatDate(detail.deletedAt)}
              </DashboardMetaPill>
            ) : null}
          </>
        }
        title={title}
      />

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardSection
            description="What the customer asked for, as submitted."
            title="Request"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Service category"
                value={detail.serviceCategory || "—"}
              />
              <DetailField
                label="Budget"
                value={detail.budgetText || "—"}
              />
              <DetailField
                label="Requested deadline"
                value={detail.requestedDeadline || "—"}
              />
              <DetailField
                label="Source"
                value={inquirySourceLabels[normalizeInquirySource(detail.source)]}
              />
              <DetailField
                label="Quote requested"
                value={detail.quoteRequested ? "Yes" : "No"}
              />
              <DetailField
                label="Qualification"
                value={
                  detail.qualificationScore === null &&
                  !detail.qualificationTemperature
                    ? "Not scored"
                    : [
                        detail.qualificationTemperature
                          ? detail.qualificationTemperature
                              .charAt(0)
                              .toUpperCase() +
                            detail.qualificationTemperature.slice(1)
                          : null,
                        detail.qualificationScore === null
                          ? null
                          : `score ${detail.qualificationScore}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"
                }
              />
              <DetailField
                label="AI assisted"
                value={detail.aiAssisted ? "Yes" : "No"}
              />
              <DetailField
                label="Escalated"
                value={detail.escalated ? "Yes" : "No"}
              />
            </div>
            <div className="mt-3" data-padding="none">
              <div className="soft-panel px-4 py-3 shadow-none">
                <p className="meta-label">Details</p>
                <p className="mt-1.5 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                  {detail.details}
                </p>
              </div>
            </div>
          </DashboardSection>

          <DashboardSection
            description="Conversation history on this inquiry, oldest first."
            title={`Messages (${detail.messages.length})`}
          >
            {detail.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages recorded.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.messages.map((message) => (
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
                    title={message.role === "user" ? detail.customerName : "Assistant"}
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

          <DashboardSection
            description="Internal owner notes, oldest first."
            title={`Notes (${detail.notes.length})`}
          >
            {detail.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes recorded.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.notes.map((note) => (
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

          <DashboardSection
            description="File metadata only — downloads stay inside the business dashboard."
            title={`Attachments (${detail.attachments.length})`}
          >
            {detail.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attachments.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.attachments.map((attachment) => (
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

          <DashboardSection
            description="Quotes drafted from this inquiry."
            title={`Linked quotes (${detail.linkedQuotes.length})`}
          >
            {detail.linkedQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No quotes drafted from this inquiry yet.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.linkedQuotes.map((quote) => (
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
        </div>

        <DashboardSidebarStack>
          <DashboardSection title="Customer">
            <div className="flex flex-col gap-3">
              <DetailField label="Name" value={detail.customerName} />
              <DetailField label="Email" value={detail.customerEmail || "—"} />
              <DetailField
                label="Contact"
                value={`${detail.customerContactMethod || "—"}${detail.customerContactHandle ? ` · ${detail.customerContactHandle}` : ""}`}
              />
            </div>
          </DashboardSection>

          <DashboardSection title="Business">
            <div className="flex flex-col gap-3">
              <DetailField label="Name" value={detail.business.name} />
              <DetailField
                label="Slug"
                value={detail.business.slug}
              />
              <DetailField label="Owner" value={detail.owner.email} />
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={getAdminBusinessDetailPath(detail.business.id)}
              >
                View business in admin →
              </Link>
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={getAdminUserDetailPath(detail.owner.userId)}
              >
                View owner in admin →
              </Link>
              <Link
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                href={ADMIN_BUSINESSES_PATH}
              >
                ← All businesses
              </Link>
            </div>
          </DashboardSection>

          <DashboardSection title="Activity">
            <div className="flex flex-col gap-3">
              <DetailField
                label="Submitted"
                value={formatDateTime(detail.submittedAt)}
              />
              <DetailField
                label="Last responded"
                value={
                  detail.lastRespondedAt
                    ? formatDateTime(detail.lastRespondedAt)
                    : "No response yet"
                }
              />
              {detail.qualificationScore !== null ||
              detail.escalated ||
              detail.aiAssisted ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {detail.aiAssisted ? (
                    <Badge variant="secondary">AI assisted</Badge>
                  ) : null}
                  {detail.escalated ? (
                    <Badge variant="destructive">Escalated</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}
