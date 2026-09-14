import Link from "next/link";

import { DashboardSection } from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { inquiryStatuses, type InquiryStatus } from "@/features/inquiries/types";
import { getInquiryStatusLabel } from "@/features/inquiries/utils";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { quoteStatuses, type QuoteStatus } from "@/features/quotes/types";
import { getQuoteStatusLabel } from "@/features/quotes/utils";
import { AdminEmailStatusBadge } from "@/features/admin/components/primitives/admin-status-badges";
import {
  ADMIN_AI_PATH,
  ADMIN_EMAILS_PATH,
  ADMIN_INQUIRIES_PATH,
  ADMIN_QUOTES_PATH,
} from "@/features/admin/navigation";
import { emailOutboxStatuses } from "@/lib/db/schema/email";
import type { EmailOutboxStatus } from "@/lib/db/schema/email";
import type {
  AdminOverviewAi,
  AdminOverviewEmail,
  AdminOverviewInquiries,
  AdminOverviewQuotes,
} from "@/features/admin/types";
import {
  formatAdminCount,
  formatAdminCostCents,
  formatAdminPercent,
} from "@/features/admin/components/overview/admin-overview-stats";

/**
 * Cost-floor notice for the AI section.
 *
 * `estimated_cost_cents` is NULL for unpriced models, so the summed cost
 * silently excludes those calls. Returning null when every call was priced
 * keeps the section quiet in the common case; otherwise the UI must show
 * this or the cost figure lies.
 */
export function getUnpricedCostNote(unpricedCalls: number): string | null {
  if (unpricedCalls <= 0) {
    return null;
  }

  const calls = unpricedCalls === 1 ? "1 call" : `${unpricedCalls} calls`;

  return `Excludes ${calls} with unpriced models — actual spend is higher.`;
}

function emailStatusLabel(status: EmailOutboxStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function BreakdownRow({
  label,
  badge,
  count,
}: {
  label: string;
  badge: React.ReactNode;
  count: number;
}) {
  return (
    <li
      aria-label={`${label}: ${formatAdminCount(count)}`}
      className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-0"
    >
      {badge}
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {formatAdminCount(count)}
      </span>
    </li>
  );
}

/**
 * Inquiry pipeline across every business, excluding soft-deleted rows.
 */
export function AdminOverviewInquiriesSection({
  inquiries,
}: {
  inquiries: AdminOverviewInquiries;
}) {
  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_INQUIRIES_PATH} prefetch={true}>
            View inquiries
          </Link>
        </Button>
      }
      description={`${formatAdminCount(inquiries.total)} across all businesses, excluding deleted.`}
      title="Inquiries"
    >
      <ul>
        {(inquiryStatuses as readonly InquiryStatus[]).map((status) => (
          <BreakdownRow
            badge={<InquiryStatusBadge status={status} />}
            count={inquiries.byStatus[status]}
            key={status}
            label={getInquiryStatusLabel(status)}
          />
        ))}
      </ul>
    </DashboardSection>
  );
}

/**
 * Quote pipeline across every business, excluding soft-deleted rows.
 */
export function AdminOverviewQuotesSection({
  quotes,
}: {
  quotes: AdminOverviewQuotes;
}) {
  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_QUOTES_PATH} prefetch={true}>
            View quotes
          </Link>
        </Button>
      }
      description={`${formatAdminCount(quotes.total)} across all businesses, excluding deleted.`}
      title="Quotes"
    >
      <ul>
        {(quoteStatuses as readonly QuoteStatus[]).map((status) => (
          <BreakdownRow
            badge={<QuoteStatusBadge status={status} />}
            count={quotes.byStatus[status]}
            key={status}
            label={getQuoteStatusLabel(status)}
          />
        ))}
      </ul>
    </DashboardSection>
  );
}

/**
 * AI spend and reliability for the trailing 24 hours.
 */
export function AdminOverviewAiSection({ ai }: { ai: AdminOverviewAi }) {
  const errorRate = formatAdminPercent(ai.errors, ai.calls);
  const cacheHitRate = formatAdminPercent(ai.cacheHits, ai.calls);
  const unpricedNote = getUnpricedCostNote(ai.unpricedCalls);

  const facts: Array<{ label: string; value: string }> = [
    { label: "Calls (24h)", value: formatAdminCount(ai.calls) },
    {
      label: "Errors",
      value:
        errorRate === null
          ? formatAdminCount(ai.errors)
          : `${formatAdminCount(ai.errors)} · ${errorRate}`,
    },
    { label: "Tokens (24h)", value: formatAdminCount(ai.totalTokens) },
    { label: "Est. cost (24h)", value: formatAdminCostCents(ai.estimatedCostCents) },
    {
      label: "Cache hits",
      value:
        cacheHitRate === null
          ? formatAdminCount(ai.cacheHits)
          : `${formatAdminCount(ai.cacheHits)} · ${cacheHitRate}`,
    },
    {
      label: "Avg latency",
      value:
        ai.averageLatencyMs === null
          ? "No calls in window"
          : `${formatAdminCount(Math.round(ai.averageLatencyMs))} ms`,
    },
  ];

  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_AI_PATH} prefetch={true}>
            View AI
          </Link>
        </Button>
      }
      description="Model usage, cost, and reliability for the last 24 hours."
      title="AI"
    >
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {facts.map((fact) => (
          <div className="min-w-0" key={fact.label}>
            <dt className="meta-label">{fact.label}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {unpricedNote ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {unpricedNote}
        </p>
      ) : null}
    </DashboardSection>
  );
}

/**
 * Transactional email throughput for the trailing 24-hour and 7-day windows.
 */
export function AdminOverviewEmailSection({ email }: { email: AdminOverviewEmail }) {
  return (
    <DashboardSection
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={ADMIN_EMAILS_PATH} prefetch={true}>
            View emails
          </Link>
        </Button>
      }
      description={`${formatAdminCount(email.last7d.total)} sent or attempted in the last 7 days.`}
      title="Email"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="meta-label">Last 24 hours</h3>
          <ul className="mt-2">
            {(
              emailOutboxStatuses as readonly EmailOutboxStatus[]
            ).map((status) => (
              <BreakdownRow
                badge={<AdminEmailStatusBadge status={status} />}
                count={email.last24h.byStatus[status]}
                key={status}
                label={emailStatusLabel(status)}
              />
            ))}
          </ul>
        </div>
        <div>
          <h3 className="meta-label">Last 7 days</h3>
          <ul className="mt-2">
            {(
              emailOutboxStatuses as readonly EmailOutboxStatus[]
            ).map((status) => (
              <BreakdownRow
                badge={<AdminEmailStatusBadge status={status} />}
                count={email.last7d.byStatus[status]}
                key={status}
                label={emailStatusLabel(status)}
              />
            ))}
          </ul>
        </div>
      </div>
    </DashboardSection>
  );
}
