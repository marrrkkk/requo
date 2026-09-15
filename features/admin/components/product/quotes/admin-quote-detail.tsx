import Link from "next/link";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardDetailLayout,
  DashboardMetaPill,
  DashboardSection,
  DashboardSidebarStack,
  DashboardTableContainer,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminEmailStatusBadge } from "@/features/admin/components/primitives/admin-status-badges";
import {
  formatAdminMoney,
  getQuoteDeliverySummary,
} from "@/features/admin/components/product/admin-product-format";
import {
  ADMIN_QUOTES_PATH,
  getAdminBusinessDetailPath,
  getAdminInquiryDetailPath,
} from "@/features/admin/navigation";
import type { AdminQuoteDetail } from "@/features/admin/types";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
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
 * Read-only admin detail view for a quote.
 *
 * Leads with the delivery question — `sentAt`, view/response timestamps,
 * and the matching `email_outbox` rows — because that is the operational
 * question support asks first. Then amounts, line items, version history,
 * and revision requests. Passive inspection only, no customer-facing
 * editing.
 */
export function AdminQuoteDetail({ detail }: { detail: AdminQuoteDetail }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardDetailHeader
        eyebrow={
          <Link
            className="underline-offset-4 hover:text-primary hover:underline"
            href={ADMIN_QUOTES_PATH}
          >
            ← Quotes
          </Link>
        }
        meta={
          <>
            <DashboardMetaPill>
              <QuoteStatusBadge status={detail.status} />
            </DashboardMetaPill>
            <DashboardMetaPill>
              {formatAdminMoney(detail.totalInCents, detail.currency)}
            </DashboardMetaPill>
            <DashboardMetaPill>{detail.business.name}</DashboardMetaPill>
            {detail.sentAt ? (
              <DashboardMetaPill>
                Sent {formatDate(detail.sentAt)}
              </DashboardMetaPill>
            ) : (
              <DashboardMetaPill>Not sent</DashboardMetaPill>
            )}
          </>
        }
        title={detail.quoteNumber}
        description={detail.title}
      />

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardSection
            description="Whether this quote actually reached the customer."
            title="Delivery"
          >
            <p className="text-sm font-medium text-foreground">
              {getQuoteDeliverySummary(detail.sentAt, detail.emails)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DetailField
                label="Sent at"
                value={detail.sentAt ? formatDateTime(detail.sentAt) : "—"}
              />
              <DetailField
                label="First viewed"
                value={
                  detail.publicViewedAt
                    ? formatDateTime(detail.publicViewedAt)
                    : "—"
                }
              />
              <DetailField
                label="Customer responded"
                value={
                  detail.customerRespondedAt
                    ? formatDateTime(detail.customerRespondedAt)
                    : "—"
                }
              />
            </div>
            {detail.customerResponseMessage ? (
              <div className="mt-3" data-padding="none">
                <div className="soft-panel px-4 py-3 shadow-none">
                  <p className="meta-label">Response message</p>
                  <p className="mt-1.5 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                    {detail.customerResponseMessage}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="mt-4">
              <h3 className="meta-label">Auto follow-up</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {describeAutoFollowUp(detail)}
              </p>
            </div>
            <div className="mt-4">
              <h3 className="meta-label">Delivery emails</h3>
              {detail.emails.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  No delivery emails on record for this quote.
                </p>
              ) : (
                <DashboardDetailFeed className="mt-2">
                  {detail.emails.map((email) => (
                    <DashboardDetailFeedItem
                      key={email.id}
                      meta={
                        <>
                          <AdminEmailStatusBadge status={email.status} />
                          {email.provider ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{email.provider}</span>
                            </>
                          ) : null}
                          <span aria-hidden="true">·</span>
                          <span>
                            {email.sentAt
                              ? `Sent ${formatDateTime(email.sentAt)}`
                              : `Recorded ${formatDateTime(email.createdAt)}`}
                          </span>
                          {email.attempts > 1 ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{email.attempts} attempts</span>
                            </>
                          ) : null}
                        </>
                      }
                      title={email.subject}
                    />
                  ))}
                </DashboardDetailFeed>
              )}
            </div>
          </DashboardSection>

          <DashboardSection
            description={`Version ${detail.version} · valid until ${detail.validUntil}.`}
            title="Amounts"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Subtotal"
                value={formatAdminMoney(detail.subtotalInCents, detail.currency)}
              />
              <DetailField
                label="Discount"
                value={formatAdminMoney(detail.discountInCents, detail.currency)}
              />
              <DetailField
                label="Tax"
                value={formatAdminMoney(detail.taxInCents, detail.currency)}
              />
              <DetailField
                label="Total"
                value={formatAdminMoney(detail.totalInCents, detail.currency)}
              />
            </div>
            {detail.notes || detail.terms ? (
              <div className="mt-3 grid gap-3">
                {detail.notes ? (
                  <div data-padding="none" className="soft-panel px-4 py-3 shadow-none">
                    <p className="meta-label">Customer notes</p>
                    <p className="mt-1.5 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                      {detail.notes}
                    </p>
                  </div>
                ) : null}
                {detail.terms ? (
                  <div data-padding="none" className="soft-panel px-4 py-3 shadow-none">
                    <p className="meta-label">Terms</p>
                    <p className="mt-1.5 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                      {detail.terms}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DashboardSection>

          <DashboardSection
            description={`${detail.items.length} line items in position order.`}
            title="Items"
          >
            {detail.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No line items on this quote.
              </p>
            ) : (
              <DashboardTableContainer innerClassName="border-border/60">
                <Table className="min-w-[36rem]">
                  <TableCaption className="sr-only">
                    Quote line items.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[5rem] text-right">Qty</TableHead>
                      <TableHead className="w-[8rem] text-right">Unit</TableHead>
                      <TableHead className="w-[8rem] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-full">
                          <span className="block truncate text-sm text-foreground">
                            {item.description}
                          </span>
                        </TableCell>
                        <TableCell className="w-[5rem] text-right text-sm tabular-nums text-muted-foreground">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="w-[8rem] text-right text-sm tabular-nums text-muted-foreground">
                          {formatAdminMoney(item.unitPriceInCents, detail.currency)}
                        </TableCell>
                        <TableCell className="w-[8rem] text-right text-sm font-medium tabular-nums text-foreground">
                          {formatAdminMoney(item.lineTotalInCents, detail.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DashboardTableContainer>
            )}
          </DashboardSection>

          <DashboardSection
            description="Prior revisions, newest first. Item snapshots are omitted to keep this view light."
            title={`Versions (${detail.versions.length})`}
          >
            {detail.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No prior versions — this is the original.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.versions.map((version) => (
                  <DashboardDetailFeedItem
                    key={version.id}
                    meta={
                      <>
                        <span>
                          {formatAdminMoney(version.totalInCents, version.currency)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(version.createdAt)}</span>
                      </>
                    }
                    title={`Version ${version.version} — ${version.title}`}
                  />
                ))}
              </DashboardDetailFeed>
            )}
          </DashboardSection>

          <DashboardSection
            description="Customer revision requests, newest first."
            title={`Revision requests (${detail.revisionRequests.length})`}
          >
            {detail.revisionRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No revision requests.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.revisionRequests.map((request) => (
                  <DashboardDetailFeedItem
                    key={request.id}
                    meta={
                      <>
                        <Badge variant="outline">{request.status}</Badge>
                        <span aria-hidden="true">·</span>
                        <span>Version {request.version}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(request.createdAt)}</span>
                        {request.resolvedAt ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Resolved {formatDateTime(request.resolvedAt)}</span>
                          </>
                        ) : null}
                      </>
                    }
                    title={request.message || "Revision requested"}
                    titleLines={2}
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
              {detail.acceptedAt ? (
                <DetailField
                  label="Accepted"
                  value={formatDateTime(detail.acceptedAt)}
                />
              ) : null}
            </div>
          </DashboardSection>

          <DashboardSection title="Source inquiry">
            {detail.linkedInquiry ? (
              <div className="flex flex-col gap-3">
                <DetailField
                  label="Subject"
                  value={detail.linkedInquiry.subject?.trim() || "—"}
                />
                <div>
                  <InquiryStatusBadge status={detail.linkedInquiry.status} />
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={getAdminInquiryDetailPath(detail.linkedInquiry.id)}
                    prefetch={true}
                  >
                    Open inquiry
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No linked inquiry — this quote was created manually.
              </p>
            )}
          </DashboardSection>

          <DashboardSection title="Business">
            <div className="flex flex-col gap-3">
              <DetailField label="Name" value={detail.business.name} />
              <DetailField label="Slug" value={detail.business.slug} />
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={getAdminBusinessDetailPath(detail.businessId)}
              >
                View business in admin →
              </Link>
            </div>
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}

function describeAutoFollowUp(detail: AdminQuoteDetail): string {
  const { autoFollowUp } = detail;

  if (!autoFollowUp.enabled && autoFollowUp.attempts === 0) {
    return "Disabled — no automatic follow-ups will send.";
  }

  const parts = [
    autoFollowUp.enabled ? "Enabled" : "Stopped",
    `every ${autoFollowUp.delayDays} ${autoFollowUp.delayDays === 1 ? "day" : "days"}`,
    `${autoFollowUp.attempts} of ${autoFollowUp.maxAttempts} sent`,
  ];

  if (autoFollowUp.lastSentAt) {
    parts.push(`last sent ${formatDateTime(autoFollowUp.lastSentAt)}`);
  }

  if (autoFollowUp.stoppedAt) {
    parts.push(`stopped ${formatDateTime(autoFollowUp.stoppedAt)}`);
  }

  return `${parts.join(" · ")}.`;
}
