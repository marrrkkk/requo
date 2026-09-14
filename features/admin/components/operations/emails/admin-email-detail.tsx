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
import { AdminEmailStatusBadge } from "@/features/admin/components/primitives/admin-status-badges";
import {
  ADMIN_EMAILS_PATH,
  getAdminBusinessDetailPath,
} from "@/features/admin/navigation";
import type { AdminEmailDetail } from "@/features/admin/types";

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
 * Read-only admin detail view for a transactional email.
 *
 * Privacy contract (mirrored by the query, which never selects `cc`/`bcc`
 * and only loads bodies for non-auth types):
 *
 * - `subject`, recipients, status, provider, attempts, errors, and
 *   timestamps always render.
 * - `html`/`textBody` render only when `type !== "auth"` — for auth
 *   emails the page shows "Body redacted for auth emails" instead, so
 *   verification codes and magic links never reach the browser.
 * - `cc`/`bcc` never render.
 */
export function AdminEmailDetailView({
  detail,
}: {
  detail: AdminEmailDetail;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardDetailHeader
        eyebrow={
          <Link
            className="underline-offset-4 hover:text-primary hover:underline"
            href={ADMIN_EMAILS_PATH}
          >
            ← Emails
          </Link>
        }
        meta={
          <>
            <DashboardMetaPill>
              <AdminEmailStatusBadge status={detail.status} />
            </DashboardMetaPill>
            <DashboardMetaPill>
              <Badge variant="ghost">{detail.type}</Badge>
            </DashboardMetaPill>
            {detail.businessName ? (
              <DashboardMetaPill>{detail.businessName}</DashboardMetaPill>
            ) : null}
            <DashboardMetaPill>
              {detail.sentAt
                ? `Sent ${formatDateTime(detail.sentAt)}`
                : `Recorded ${formatDateTime(detail.createdAt)}`}
            </DashboardMetaPill>
          </>
        }
        title={detail.subject}
      />

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardSection
            description="Delivery state and provider references."
            title="Delivery"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Provider"
                value={detail.provider || "—"}
              />
              <DetailField
                label="Provider message id"
                value={detail.providerMessageId || "—"}
              />
              <DetailField
                label="Attempts"
                value={`${detail.attempts}`}
              />
              <DetailField
                label="Last error"
                value={detail.lastError || "—"}
              />
              <DetailField
                label="Idempotency key"
                value={detail.idempotencyKey}
              />
              <DetailField
                label="Updated"
                value={formatDateTime(detail.updatedAt)}
              />
            </div>
          </DashboardSection>

          <DashboardSection
            description="Created → provider attempts → sent or failed, plus retryability."
            title={`Attempts (${detail.timeline.length})`}
          >
            {detail.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No provider attempts recorded yet — the email is still{" "}
                {detail.status}.
              </p>
            ) : (
              <DashboardDetailFeed>
                {detail.timeline.map((attempt) => (
                  <DashboardDetailFeedItem
                    key={attempt.id}
                    meta={
                      <>
                        <span className="capitalize">{attempt.provider}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{attempt.status}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(attempt.createdAt)}</span>
                        {attempt.retryable ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Retryable</span>
                          </>
                        ) : null}
                      </>
                    }
                    title={
                      attempt.errorMessage || "Attempt recorded"
                    }
                    titleLines={2}
                  />
                ))}
              </DashboardDetailFeed>
            )}
          </DashboardSection>

          <DashboardSection
            description={
              detail.bodyRedacted
                ? "Hidden by the auth-email privacy rule."
                : "What the customer received."
            }
            title="Body"
          >
            {detail.bodyRedacted ? (
              <p className="text-sm text-muted-foreground">
                Body redacted for auth emails.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {detail.textBody ? (
                  <div data-padding="none" className="soft-panel px-4 py-3 shadow-none">
                    <p className="meta-label">Text version</p>
                    <p className="mt-1.5 text-sm leading-6 text-foreground whitespace-pre-wrap break-words">
                      {detail.textBody}
                    </p>
                  </div>
                ) : null}
                {detail.html ? (
                  <div>
                    <p className="meta-label">HTML version</p>
                    <iframe
                      className="mt-1.5 h-[480px] w-full rounded-lg border border-border/60 bg-background"
                      sandbox=""
                      srcDoc={detail.html}
                      title={`HTML body of "${detail.subject}"`}
                    />
                  </div>
                ) : null}
                {!detail.textBody && !detail.html ? (
                  <p className="text-sm text-muted-foreground">
                    No body content stored for this email.
                  </p>
                ) : null}
              </div>
            )}
          </DashboardSection>
        </div>

        <DashboardSidebarStack>
          <DashboardSection title="Recipients">
            {detail.recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipients.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {detail.recipients.map((recipient) => (
                  <li
                    className="truncate text-sm font-medium text-foreground"
                    key={recipient}
                  >
                    {recipient}
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection title="Business">
            {detail.businessId && detail.businessName ? (
              <div className="flex flex-col gap-3">
                <DetailField label="Name" value={detail.businessName} />
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={getAdminBusinessDetailPath(detail.businessId)}
                >
                  View business in admin →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No business attached — a system email.
              </p>
            )}
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </div>
  );
}
