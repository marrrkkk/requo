import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Inbox,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  DashboardActionsRow,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { HelpTooltip } from "@/components/shared/help-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAnalyticsPercent } from "@/features/analytics/utils";
import { DashboardActivationChecklist } from "@/features/businesses/components/dashboard-activation-checklist";
import {
  getBusinessAnalyticsPath,
  getBusinessInquiriesPath,
  getBusinessInquiryFormsPath,
  getBusinessInquiryPath,
  getBusinessNewQuotePath,
  getBusinessQuotePath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import type {
  BusinessDashboardSummaryData,
  BusinessOverviewData,
  BusinessOverviewInquiryActionItem,
  BusinessOverviewQuoteActionItem,
} from "@/features/businesses/types";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import type { InquiryStatus } from "@/features/inquiries/types";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { formatQuoteDate, formatQuoteMoney } from "@/features/quotes/utils";
import { getBusinessPublicInquiryUrl } from "@/features/settings/utils";
import { cn } from "@/lib/utils";

const overviewQueueMaxItems = 4;

type DashboardOverviewSummaryPromise = Promise<BusinessDashboardSummaryData>;
type DashboardOverviewDataPromise = Promise<BusinessOverviewData>;

type DashboardOverviewChecklistSectionProps = {
  businessName: string;
  businessSlug: string;
  publicInquiryEnabled: boolean;
  summaryPromise: DashboardOverviewSummaryPromise;
};

export async function DashboardOverviewChecklistSection({
  businessName,
  businessSlug,
  publicInquiryEnabled,
  summaryPromise,
}: DashboardOverviewChecklistSectionProps) {
  const summary = await summaryPromise;
  const showActivationChecklist =
    !publicInquiryEnabled || summary.totalInquiries === 0 || summary.totalQuotes === 0;

  if (!showActivationChecklist) {
    return null;
  }

  return (
    <DashboardActivationChecklist
      businessName={businessName}
      inquiriesPath={getBusinessInquiriesPath(businessSlug)}
      newQuotePath={getBusinessNewQuotePath(businessSlug)}
      publicInquiryEnabled={publicInquiryEnabled}
      publicInquiryUrl={getBusinessPublicInquiryUrl(businessSlug)}
      totalInquiries={summary.totalInquiries}
      totalQuotes={summary.totalQuotes}
    />
  );
}

type DashboardOverviewStatsSectionProps = {
  overviewPromise: DashboardOverviewDataPromise;
};

export async function DashboardOverviewStatsSection({
  overviewPromise,
}: DashboardOverviewStatsSectionProps) {
  const overview = await overviewPromise;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <OverviewActionStat
        label="Overdue"
        note="Past deadline"
        value={overview.counts.overdueInquiries}
      />
      <OverviewActionStat
        label="Expiring soon"
        note="Next 7 days"
        value={overview.counts.expiringSoonQuotes}
      />
      <OverviewActionStat
        label="New"
        note="Last 48h"
        value={overview.counts.newInquiries}
      />
      <OverviewActionStat
        label="Follow up due"
        note="Sent 3+ days ago"
        value={overview.counts.followUpDueQuotes}
      />
    </div>
  );
}

type DashboardOverviewQueuesSectionProps = {
  businessSlug: string;
  publicInquiryEnabled: boolean;
  summaryPromise: DashboardOverviewSummaryPromise;
  overviewPromise: DashboardOverviewDataPromise;
};

export async function DashboardOverviewQueuesSection({
  businessSlug,
  publicInquiryEnabled,
  summaryPromise,
  overviewPromise,
}: DashboardOverviewQueuesSectionProps) {
  const [summary, overview] = await Promise.all([summaryPromise, overviewPromise]);
  const closedOutcomeCount = summary.wonCount + summary.lostCount;
  const winRate = closedOutcomeCount ? summary.wonCount / closedOutcomeCount : 0;
  const publicInquiryUrl = getBusinessPublicInquiryUrl(businessSlug);
  const overdueInquiryPath = getBusinessInquiriesStatusPath(
    businessSlug,
    "overdue",
  );
  const newInquiryPath = getBusinessInquiriesStatusPath(
    businessSlug,
    "new",
  );

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2">
        <OverviewQueueCard
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href={overdueInquiryPath} prefetch={true}>
                All overdue
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
          count={overview.counts.overdueInquiries}
          title="Overdue"
        >
          {overview.overdueInquiries.length ? (
            <OverviewQueueList
              emptySlots={overviewQueueMaxItems - overview.overdueInquiries.length}
            >
              {overview.overdueInquiries.map((inquiry) => (
                <OverviewInquiryRow
                  inquiry={inquiry}
                  key={inquiry.id}
                  metaLabel="Submitted"
                  businessSlug={businessSlug}
                />
              ))}
            </OverviewQueueList>
          ) : (
            <DashboardEmptyState
              className="h-full px-5 py-12 sm:px-6"
              description="Requests with a passed deadline show up here."
              icon={Inbox}
              title="No overdue inquiries"
              variant="flat"
            />
          )}
        </OverviewQueueCard>

        <OverviewQueueCard
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href={getBusinessQuotesPath(businessSlug)} prefetch={true}>
                All quotes
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
          count={overview.counts.expiringSoonQuotes}
          title="Quotes expiring soon"
        >
          {overview.expiringSoonQuotes.length ? (
            <div className="flex flex-col divide-y divide-border/70">
              {overview.expiringSoonQuotes.map((quote) => (
                <OverviewQuoteRow
                  key={quote.id}
                  meta={`Expires ${formatQuoteDate(quote.validUntil)}`}
                  quote={quote}
                  businessSlug={businessSlug}
                />
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              className="px-5 py-12 sm:px-6"
              description="No sent quotes are due to expire in the next 7 days."
              icon={FileText}
              title="Nothing expiring soon"
              variant="flat"
            />
          )}
        </OverviewQueueCard>

        <OverviewQueueCard
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href={newInquiryPath} prefetch={true}>
                All new
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
          count={overview.counts.newInquiries}
          title="New"
        >
          {overview.newInquiries.length ? (
            <OverviewQueueList
              emptySlots={overviewQueueMaxItems - overview.newInquiries.length}
            >
              {overview.newInquiries.map((inquiry) => (
                <OverviewInquiryRow
                  inquiry={inquiry}
                  key={inquiry.id}
                  metaLabel="Submitted"
                  businessSlug={businessSlug}
                />
              ))}
            </OverviewQueueList>
          ) : (
            <DashboardEmptyState
              action={
                <Button asChild variant="outline">
                  <Link href={newInquiryPath} prefetch={true}>
                    Open new inquiries
                  </Link>
                </Button>
              }
              className="h-full px-5 py-12 sm:px-6"
              description="New inquiries from the last 48 hours show up here."
              icon={Inbox}
              title="No new inquiries"
              variant="flat"
            />
          )}
        </OverviewQueueCard>

        <OverviewQueueCard
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href={getBusinessQuotesPath(businessSlug)} prefetch={true}>
                View follow-up
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
          count={overview.counts.followUpDueQuotes}
          title="Follow up due"
        >
          {overview.followUpDueQuotes.length ? (
            <div className="flex flex-col divide-y divide-border/70">
              {overview.followUpDueQuotes.map((quote) => (
                <OverviewQuoteRow
                  key={quote.id}
                  meta={
                    quote.sentAt
                      ? [
                          `Sent ${formatQuoteDate(quote.sentAt)}`,
                          `Expires ${formatQuoteDate(quote.validUntil)}`,
                        ].join(" | ")
                      : `Expires ${formatQuoteDate(quote.validUntil)}`
                  }
                  quote={quote}
                  businessSlug={businessSlug}
                />
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              className="px-5 py-12 sm:px-6"
              description="There are no sent quotes waiting at least 3 days for a response right now."
              icon={FileText}
              title="No follow-up due"
              variant="flat"
            />
          )}
        </OverviewQueueCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <OverviewQueueCard
          action={
            <Button asChild size="sm" variant="ghost">
              <Link
                href={`${getBusinessQuotesPath(businessSlug)}?status=accepted`}
                prefetch={true}
              >
                Accepted quotes
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          }
          count={overview.counts.recentAcceptedQuotes}
          title="Recently accepted"
        >
          {overview.recentAcceptedQuotes.length ? (
            <div className="flex flex-col divide-y divide-border/70">
              {overview.recentAcceptedQuotes.map((quote) => (
                <OverviewQuoteRow
                  key={quote.id}
                  meta={`Accepted ${formatQuoteDate(quote.acceptedAt ?? quote.updatedAt)}`}
                  quote={quote}
                  businessSlug={businessSlug}
                />
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              className="px-5 py-12 sm:px-6"
              description="Accepted work from the last 14 days will show up here."
              icon={CheckCircle2}
              title="No recent wins"
              variant="flat"
            />
          )}
        </OverviewQueueCard>

        <section className="section-panel overflow-hidden">
          <div className="flex h-full flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col divide-y divide-border/70">
              <OverviewSidebarMetric
                label="This week"
                tooltip="New inquiries this week"
                value={`${summary.inquiriesThisWeek}`}
              />
              <OverviewSidebarMetric
                label="Coverage"
                tooltip="Inquiries turned into quotes"
                value={formatAnalyticsPercent(summary.inquiryCoverageRate)}
              />
              <OverviewSidebarMetric
                label="Win rate"
                tooltip="Won inquiries versus lost inquiries"
                value={formatAnalyticsPercent(winRate)}
              />
            </div>

            <div className="mt-auto flex flex-col gap-2.5">
              <Button asChild variant="outline">
                <Link href={getBusinessAnalyticsPath(businessSlug)} prefetch={true}>
                  View analytics
                  <BarChart3 data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link
                  href={
                    publicInquiryEnabled
                      ? publicInquiryUrl
                      : getBusinessInquiryFormsPath(businessSlug)
                  }
                  prefetch={publicInquiryEnabled ? false : undefined}
                  rel={publicInquiryEnabled ? "noreferrer" : undefined}
                  target={publicInquiryEnabled ? "_blank" : undefined}
                >
                  {publicInquiryEnabled ? "Open public form" : "Open forms"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export function DashboardOverviewChecklistFallback() {
  return (
    <DashboardSection
      action={<Skeleton className="h-6 w-28 rounded-full" />}
      description={
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
          <Skeleton className="h-4 w-full max-w-lg rounded-md" />
        </div>
      }
      footer={
        <DashboardActionsRow className="w-full [&>*]:w-full sm:[&>*]:w-auto">
          <Skeleton className="h-10 w-full rounded-xl sm:w-44" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
          <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
        </DashboardActionsRow>
      }
      title="Get your workflow live"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="soft-panel flex items-start gap-3 px-4 py-4" key={index}>
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-full max-w-xs rounded-md" />
              <Skeleton className="h-4 w-full max-w-[14rem] rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

export function DashboardOverviewStatsFallback() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="soft-panel px-4 py-4" key={index}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-8 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function DashboardOverviewQueuesFallback() {
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <OverviewQueueCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <OverviewQueueCardSkeleton />

        <section className="section-panel overflow-hidden">
          <div className="flex h-full flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col divide-y divide-border/70">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                  key={index}
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded-md" />
                    <Skeleton className="size-4 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-2.5">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function OverviewActionStat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="soft-panel px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="meta-label">{label}</p>
        <span className="text-xs font-medium text-muted-foreground">{note}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-[1.85rem] font-semibold tracking-tight text-foreground",
          value > 0 && "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function OverviewSidebarMetric({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {tooltip ? <HelpTooltip content={tooltip} label={label} /> : null}
      </div>
      <p className="text-sm font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function OverviewQueueCard({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <Badge variant={count ? "secondary" : "outline"}>{count}</Badge>
        </div>
        {action}
      </div>
      <div className="flex min-h-[21rem] flex-1 flex-col">{children}</div>
    </section>
  );
}

function OverviewQueueList({
  children,
  emptySlots,
}: {
  children: ReactNode;
  emptySlots: number;
}) {
  return (
    <div className="flex flex-1 flex-col divide-y divide-border/70">
      {children}
      {Array.from({ length: Math.max(0, emptySlots) }).map((_, index) => (
        <div
          aria-hidden="true"
          className="min-h-[5.75rem] flex-1 px-5 py-4 sm:px-6"
          key={index}
        />
      ))}
    </div>
  );
}

function OverviewQueueCardSkeleton() {
  return (
    <section className="section-panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="flex min-h-[21rem] flex-1 flex-col divide-y divide-border/70">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="flex flex-col gap-3 px-5 py-4 sm:px-6" key={index}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <Skeleton className="size-4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getBusinessInquiriesStatusPath(
  businessSlug: string,
  status: InquiryStatus,
) {
  const searchParams = new URLSearchParams({ status });

  return `${getBusinessInquiriesPath(businessSlug)}?${searchParams.toString()}`;
}

function OverviewInquiryRow({
  inquiry,
  metaLabel,
  businessSlug,
}: {
  inquiry: BusinessOverviewInquiryActionItem;
  metaLabel: string;
  businessSlug: string;
}) {
  return (
    <Link
      className="group block px-5 py-4 transition-colors hover:bg-accent/22 sm:px-6"
      href={getBusinessInquiryPath(businessSlug, inquiry.id)}
      prefetch={true}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {inquiry.customerName}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {inquiry.customerEmail}
              </p>
            </div>
            <InquiryStatusBadge status={inquiry.status} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            className="h-6 border-transparent bg-muted/70 px-2.5 text-[0.68rem] font-medium text-muted-foreground"
            variant="secondary"
          >
            {inquiry.serviceCategory}
          </Badge>
          <span className="truncate">
            {metaLabel} {formatQuoteDate(inquiry.submittedAt)}
          </span>
        </div>
        <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function OverviewQuoteRow({
  quote,
  meta,
  businessSlug,
}: {
  quote: BusinessOverviewQuoteActionItem;
  meta: string;
  businessSlug: string;
}) {
  return (
    <Link
      className="group block px-5 py-4 transition-colors hover:bg-accent/22 sm:px-6"
      href={getBusinessQuotePath(businessSlug, quote.id)}
      prefetch={true}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {quote.title}
                </p>
                <span className="shrink-0 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {quote.quoteNumber}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {quote.customerName}
              </p>
              {quote.reminders.length || quote.postAcceptanceStatus !== "none" ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {quote.reminders.map((reminder) => (
                    <QuoteReminderBadge key={reminder} kind={reminder} />
                  ))}
                  {quote.postAcceptanceStatus !== "none" ? (
                    <QuotePostAcceptanceStatusBadge
                      status={quote.postAcceptanceStatus}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
            <QuoteStatusBadge status={quote.status} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-medium text-foreground/85">
            {formatQuoteMoney(quote.totalInCents, quote.currency)}
          </span>
          <span className="text-border">|</span>
          <span className="truncate">{meta}</span>
        </div>
        <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
