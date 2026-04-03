import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Globe2,
  Inbox,
  LayoutDashboard,
  Settings2,
  Sparkles,
} from "lucide-react";

import {
  DashboardDetailLayout,
  DashboardEmptyState,
  DashboardPage,
  DashboardSidebarStack,
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { Button } from "@/components/ui/button";
import { getWorkspaceAnalyticsData } from "@/features/analytics/queries";
import { formatAnalyticsPercent } from "@/features/analytics/utils";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { formatQuoteDate } from "@/features/quotes/utils";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import { getWorkspaceOverviewData } from "@/features/workspaces/queries";
import { OverviewActionsCard } from "@/features/workspaces/components/overview-actions-card";
import { OverviewHealthCard } from "@/features/workspaces/components/overview-health-card";
import { OverviewHeroCard } from "@/features/workspaces/components/overview-hero-card";
import { OverviewKpiCard } from "@/features/workspaces/components/overview-kpi-card";
import { OverviewListCard } from "@/features/workspaces/components/overview-list-card";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export default async function DashboardOverviewPage() {
  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const [analytics, overview] = await Promise.all([
    getWorkspaceAnalyticsData(workspaceContext.workspace.id),
    getWorkspaceOverviewData(workspaceContext.workspace.id),
  ]);
  const closedOutcomeCount = analytics.wonCount + analytics.lostCount;
  const winRate = closedOutcomeCount
    ? analytics.wonCount / closedOutcomeCount
    : 0;
  const newInquiryCount =
    analytics.inquiryStatusCounts.find((row) => row.status === "new")?.count ?? 0;
  const quoteAttentionCount = overview.quoteAttention.length;
  const publicInquiryUrl = getWorkspacePublicInquiryUrl(
    workspaceContext.workspace.slug,
  );

  return (
    <DashboardPage className="gap-8">
      <OverviewHeroCard
        workspaceName={workspaceContext.workspace.name}
        publicInquiryEnabled={workspaceContext.workspace.publicInquiryEnabled}
        newInquiryCount={newInquiryCount}
        quoteAttentionCount={quoteAttentionCount}
        actions={
          <>
            <Button asChild>
              <Link href="/dashboard/inquiries" prefetch={false}>
                Open inquiries
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/quotes/new" prefetch={false}>
                Create quote
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={publicInquiryUrl} prefetch={false} target="_blank">
                Open public form
              </Link>
            </Button>
          </>
        }
      />

      <DashboardStatsGrid>
        <OverviewKpiCard
          description={`${analytics.totalInquiries} total inquiries in the workspace.`}
          icon={Inbox}
          title="Inquiries this week"
          value={`${analytics.inquiriesThisWeek}`}
        />
        <OverviewKpiCard
          description={`${analytics.quoteSummary.totalQuotes} quotes created overall.`}
          icon={BarChart3}
          title="Sent quotes"
          value={`${analytics.quoteSummary.sentQuotes}`}
        />
        <OverviewKpiCard
          description={`${analytics.wonCount} won and ${analytics.lostCount} lost so far.`}
          icon={FileText}
          title="Win rate"
          value={formatAnalyticsPercent(winRate)}
        />
        <OverviewKpiCard
          description={`${analytics.quoteSummary.linkedInquiryCount} inquiries already have linked quotes.`}
          icon={Sparkles}
          title="Inquiry coverage"
          value={formatAnalyticsPercent(analytics.quoteSummary.inquiryCoverageRate)}
        />
      </DashboardStatsGrid>

      <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.35fr)_22rem] 2xl:grid-cols-[minmax(0,1.45fr)_24rem]">
        <DashboardSidebarStack>
          <OverviewListCard
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/inquiries" prefetch={false}>
                  View all
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            }
            count={overview.recentInquiries.length}
            description="Newest submissions that likely need triage or a reply."
            title="Recent inquiries"
          >
            {overview.recentInquiries.length ? (
              <div className="flex flex-col divide-y divide-border/70">
                {overview.recentInquiries.map((inquiry) => (
                  <OverviewInquiryRow
                    inquiry={inquiry}
                    key={inquiry.id}
                  />
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                action={
                  <Button asChild variant="outline">
                    <Link href={publicInquiryUrl} prefetch={false} target="_blank">
                      Open public form
                    </Link>
                  </Button>
                }
                className="px-6 py-10"
                description="Share the public inquiry page to start collecting customer requests into the dashboard."
                icon={Inbox}
                title="No inquiries yet"
                variant="flat"
              />
            )}
          </OverviewListCard>

          <OverviewListCard
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/quotes" prefetch={false}>
                  View all
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            }
            count={overview.quoteAttention.length}
            description="Quotes still waiting to be sent, accepted, or followed up."
            title="Quotes needing attention"
          >
            {overview.quoteAttention.length ? (
              <div className="flex flex-col divide-y divide-border/70">
                {overview.quoteAttention.map((quote) => (
                  <OverviewQuoteRow
                    key={quote.id}
                    quote={quote}
                  />
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                action={
                  <Button asChild>
                    <Link href="/dashboard/quotes/new" prefetch={false}>
                      Create quote
                    </Link>
                  </Button>
                }
                className="px-6 py-10"
                description="Draft or send a quote when an inquiry is ready to move into pricing."
                icon={FileText}
                title="No open quote work"
                variant="flat"
              />
            )}
          </OverviewListCard>
        </DashboardSidebarStack>

        <DashboardSidebarStack>
          <OverviewActionsCard
            items={[
              {
                description: workspaceContext.workspace.publicInquiryEnabled
                  ? "Open the customer-facing intake page and confirm the public flow."
                  : "Preview the public intake route even while the form is turned off.",
                external: true,
                href: publicInquiryUrl,
                icon: Globe2,
                label: "Public inquiry page",
              },
              {
                description:
                  "Update workspace identity, messaging defaults, and intake settings.",
                href: "/dashboard/settings",
                icon: Settings2,
                label: "Workspace settings",
              },
              {
                description:
                  "Open the wider performance view when you need trends and breakdowns.",
                href: "/dashboard/analytics",
                icon: LayoutDashboard,
                label: "Analytics dashboard",
              },
            ]}
          />

          <OverviewHealthCard
            acceptanceRate={analytics.quoteSummary.acceptanceRate}
            inquiryCoverageRate={analytics.quoteSummary.inquiryCoverageRate}
            newInquiryCount={newInquiryCount}
            quoteAttentionCount={quoteAttentionCount}
            recentTrend={analytics.recentTrend}
          />
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}

function OverviewInquiryRow({
  inquiry,
}: {
  inquiry: Awaited<ReturnType<typeof getWorkspaceOverviewData>>["recentInquiries"][number];
}) {
  return (
    <Link
      className="group px-6 py-4 transition-colors hover:bg-muted/35"
      href={`/dashboard/inquiries/${inquiry.id}`}
      prefetch={false}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{inquiry.customerName}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {inquiry.customerEmail}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-md border border-border/70 bg-background px-2.5 py-1">
            {inquiry.serviceCategory}
          </span>
          <span>Submitted {formatQuoteDate(inquiry.submittedAt)}</span>
        </div>
        <div className="flex items-center gap-2 lg:justify-end">
          <InquiryStatusBadge status={inquiry.status} />
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function OverviewQuoteRow({
  quote,
}: {
  quote: Awaited<ReturnType<typeof getWorkspaceOverviewData>>["quoteAttention"][number];
}) {
  return (
    <Link
      className="group px-6 py-4 transition-colors hover:bg-muted/35"
      href={`/dashboard/quotes/${quote.id}`}
      prefetch={false}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{quote.quoteNumber}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{quote.title}</p>
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>{quote.customerName}</span>
          <span>Valid until {formatQuoteDate(quote.validUntil)}</span>
          <span>
            {quote.customerRespondedAt
              ? `Customer responded ${formatQuoteDate(quote.customerRespondedAt)}`
              : `Updated ${formatQuoteDate(quote.updatedAt)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 lg:justify-end">
          <QuoteStatusBadge status={quote.status} />
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
