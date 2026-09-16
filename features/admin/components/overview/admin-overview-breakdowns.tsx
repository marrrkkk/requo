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

/**
 * One pipeline row: status badge, count, and a share-of-total bar.
 *
 * The bar uses semantic tokens (`bg-muted` track, `bg-primary` fill) so
 * every breakdown on the Overview shares one visual language.
 */
function PipelineRow({
  label,
  badge,
  count,
  total,
}: {
  label: string;
  badge: React.ReactNode;
  count: number;
  total: number;
}) {
  const percent = total > 0 ? Math.min(100, (count / total) * 100) : 0;

  return (
    <li
      aria-label={`${label}: ${formatAdminCount(count)}`}
      className="flex flex-col gap-1.5 border-b border-border/60 py-2 last:border-0"
    >
      <div className="flex items-center justify-between gap-3">
        {badge}
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatAdminCount(count)}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
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
          <PipelineRow
            badge={<InquiryStatusBadge status={status} />}
            count={inquiries.byStatus[status]}
            key={status}
            label={getInquiryStatusLabel(status)}
            total={inquiries.total}
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
          <PipelineRow
            badge={<QuoteStatusBadge status={status} />}
            count={quotes.byStatus[status]}
            key={status}
            label={getQuoteStatusLabel(status)}
            total={quotes.total}
          />
        ))}
      </ul>
    </DashboardSection>
  );
}

/**
 * One AI metric row, mirroring `PipelineRow` rhythm.
 *
 * Same dividers (`border-b border-border/60 py-2`), same label-left /
 * value-right top line, same `bg-muted` track + token fill bar — so the AI
 * card reads as one of the pipeline breakdowns instead of a loose dl grid.
 * The bar only renders where a rate exists (errors, cache hits).
 */
function AiFactRow({
  label,
  value,
  percent,
  barVariant = "primary",
}: {
  label: string;
  value: string;
  percent?: number | null;
  barVariant?: "primary" | "destructive";
}) {
  return (
    <li
      aria-label={`${label}: ${value}`}
      className="flex flex-col gap-1.5 border-b border-border/60 py-2 last:border-0"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      {percent != null ? (
        <div
          aria-hidden="true"
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={
              barVariant === "destructive"
                ? "h-full rounded-full bg-destructive"
                : "h-full rounded-full bg-primary"
            }
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </li>
  );
}

/**
 * AI spend and reliability for the trailing 24 hours.
 */
export function AdminOverviewAiSection({ ai }: { ai: AdminOverviewAi }) {
  const errorRate = formatAdminPercent(ai.errors, ai.calls);
  const cacheHitRate = formatAdminPercent(ai.cacheHits, ai.calls);
  const unpricedNote = getUnpricedCostNote(ai.unpricedCalls);
  const errorPercent =
    ai.calls > 0 ? Math.min(100, (ai.errors / ai.calls) * 100) : 0;
  const cachePercent =
    ai.calls > 0 ? Math.min(100, (ai.cacheHits / ai.calls) * 100) : 0;

  const facts: Array<{
    label: string;
    value: string;
    percent?: number;
    barVariant?: "primary" | "destructive";
  }> = [
    { label: "Calls (24h)", value: formatAdminCount(ai.calls) },
    {
      label: "Errors",
      value:
        errorRate === null
          ? formatAdminCount(ai.errors)
          : `${formatAdminCount(ai.errors)} · ${errorRate}`,
      percent: errorPercent,
      barVariant: "destructive",
    },
    { label: "Tokens (24h)", value: formatAdminCount(ai.totalTokens) },
    { label: "Est. cost (24h)", value: formatAdminCostCents(ai.estimatedCostCents) },
    {
      label: "Cache hits",
      value:
        cacheHitRate === null
          ? formatAdminCount(ai.cacheHits)
          : `${formatAdminCount(ai.cacheHits)} · ${cacheHitRate}`,
      percent: cachePercent,
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
      <ul>
        {facts.map((fact) => (
          <AiFactRow
            barVariant={fact.barVariant}
            key={fact.label}
            label={fact.label}
            percent={fact.percent}
            value={fact.value}
          />
        ))}
      </ul>
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
              <PipelineRow
                badge={<AdminEmailStatusBadge status={status} />}
                count={email.last24h.byStatus[status]}
                key={status}
                label={emailStatusLabel(status)}
                total={email.last24h.total}
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
              <PipelineRow
                badge={<AdminEmailStatusBadge status={status} />}
                count={email.last7d.byStatus[status]}
                key={status}
                label={emailStatusLabel(status)}
                total={email.last7d.total}
              />
            ))}
          </ul>
        </div>
      </div>
    </DashboardSection>
  );
}
