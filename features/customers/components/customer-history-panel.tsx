import Link from "next/link";
import { History } from "lucide-react";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import type { CustomerHistoryData } from "@/features/customers/types";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { formatInquiryDate } from "@/features/inquiries/utils";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { formatQuoteMoney } from "@/features/quotes/utils";
import {
  getWorkspaceInquiryPath,
  getWorkspaceQuotePath,
} from "@/features/workspaces/routes";

type CustomerHistoryPanelProps = {
  history: CustomerHistoryData | null;
  workspaceSlug: string;
};

export function CustomerHistoryPanel({
  history,
  workspaceSlug,
}: CustomerHistoryPanelProps) {
  return (
    <DashboardSection
      description="Past records for this customer email inside the current workspace."
      title="Customer history"
    >
      {history ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label="Past inquiries" value={`${history.inquiryCount}`} />
            <InfoTile label="Past quotes" value={`${history.quoteCount}`} />
            <InfoTile
              label="Latest outcome"
              value={
                history.latestOutcome ? (
                  history.latestOutcome.kind === "inquiry" ? (
                    <InquiryStatusBadge
                      className="w-fit"
                      status={history.latestOutcome.status}
                    />
                  ) : history.latestOutcome.postAcceptanceStatus !== "none" ? (
                    <QuotePostAcceptanceStatusBadge
                      className="w-fit"
                      status={history.latestOutcome.postAcceptanceStatus}
                    />
                  ) : (
                    <QuoteStatusBadge
                      className="w-fit"
                      status={history.latestOutcome.status}
                    />
                  )
                ) : (
                  "No prior outcome"
                )
              }
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Past inquiries</p>
              {history.inquiries.length ? (
                <DashboardDetailFeed>
                  {history.inquiries.map((inquiry) => (
                    <DashboardDetailFeedItem
                      key={inquiry.id}
                      title={
                        <Link
                          className="underline-offset-4 hover:text-primary hover:underline"
                          href={getWorkspaceInquiryPath(workspaceSlug, inquiry.id)}
                        >
                          {inquiry.serviceCategory}
                        </Link>
                      }
                      meta={`Submitted ${formatInquiryDate(inquiry.submittedAt)}`}
                      action={<InquiryStatusBadge status={inquiry.status} />}
                    />
                  ))}
                </DashboardDetailFeed>
              ) : (
                <DashboardEmptyState
                  description="No prior inquiries from this customer email yet."
                  icon={History}
                  title="No inquiry history"
                  variant="section"
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Past quotes</p>
              {history.quotes.length ? (
                <DashboardDetailFeed>
                  {history.quotes.map((quote) => (
                    <DashboardDetailFeedItem
                      key={quote.id}
                      title={
                        <Link
                          className="underline-offset-4 hover:text-primary hover:underline"
                          href={getWorkspaceQuotePath(workspaceSlug, quote.id)}
                        >
                          {quote.quoteNumber} | {quote.title}
                        </Link>
                      }
                      meta={`${formatQuoteMoney(quote.totalInCents, quote.currency)} | Created ${formatInquiryDate(quote.createdAt)}`}
                      action={
                        <div className="flex flex-wrap items-center gap-2">
                          <QuoteStatusBadge status={quote.status} />
                          {quote.postAcceptanceStatus !== "none" ? (
                            <QuotePostAcceptanceStatusBadge
                              status={quote.postAcceptanceStatus}
                            />
                          ) : null}
                        </div>
                      }
                    />
                  ))}
                </DashboardDetailFeed>
              ) : (
                <DashboardEmptyState
                  description="No prior quotes for this customer email yet."
                  icon={History}
                  title="No quote history"
                  variant="section"
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          description="This customer does not have other inquiry or quote records in the workspace yet."
          icon={History}
          title="No customer history"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}
