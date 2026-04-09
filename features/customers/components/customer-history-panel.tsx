import Link from "next/link";
import { FileText, History, ReceiptText } from "lucide-react";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CustomerHistoryData } from "@/features/customers/types";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { formatInquiryDate } from "@/features/inquiries/utils";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { formatQuoteMoney } from "@/features/quotes/utils";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";

type CustomerHistoryPanelProps = {
  history: CustomerHistoryData | null;
  businessSlug: string;
};

type CustomerHistoryTimelineItem =
  | {
      kind: "inquiry";
      id: string;
      label: string;
      status: CustomerHistoryData["inquiries"][number]["status"];
      date: Date;
    }
  | {
      kind: "quote";
      id: string;
      label: string;
      status: CustomerHistoryData["quotes"][number]["status"];
      postAcceptanceStatus: CustomerHistoryData["quotes"][number]["postAcceptanceStatus"];
      amount: number;
      currency: string;
      date: Date;
      quoteNumber: string;
    };

const CUSTOMER_HISTORY_PREVIEW_LIMIT = 1;

export function CustomerHistoryPanel({
  history,
  businessSlug,
}: CustomerHistoryPanelProps) {
  const timeline = history ? getCustomerHistoryTimeline(history) : [];
  const previewTimeline = timeline.slice(0, CUSTOMER_HISTORY_PREVIEW_LIMIT);

  return (
    <DashboardSection
      description="Past records for this customer email inside the current business."
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

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Recent activity</p>

            <DashboardDetailFeed>
              {previewTimeline.map((item) =>
                item.kind === "inquiry" ? (
                  <DashboardDetailFeedItem
                    key={item.id}
                    action={<InquiryStatusBadge status={item.status} />}
                    meta={`Inquiry | Submitted ${formatInquiryDate(item.date)}`}
                    title={
                      <Link
                        className="inline-flex items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
                        href={getBusinessInquiryPath(businessSlug, item.id)}
                      >
                        <FileText className="size-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                ) : (
                  <DashboardDetailFeedItem
                    key={item.id}
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        <QuoteStatusBadge status={item.status} />
                        {item.postAcceptanceStatus !== "none" ? (
                          <QuotePostAcceptanceStatusBadge
                            status={item.postAcceptanceStatus}
                          />
                        ) : null}
                      </div>
                    }
                    meta={`${formatQuoteMoney(item.amount, item.currency)} | Quote | Created ${formatInquiryDate(item.date)}`}
                    title={
                      <Link
                        className="inline-flex items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
                        href={getBusinessQuotePath(businessSlug, item.id)}
                      >
                        <ReceiptText className="size-4 text-muted-foreground" />
                        <span>
                          {item.quoteNumber} | {item.label}
                        </span>
                      </Link>
                    }
                  />
                ),
              )}
            </DashboardDetailFeed>

            <Sheet>
              <SheetTrigger asChild>
                <Button className="w-full" type="button" variant="outline">
                  View history
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full gap-0 sm:max-w-xl">
                <SheetHeader className="gap-2 border-b border-border/75">
                  <SheetTitle>Customer history</SheetTitle>
                  <SheetDescription>
                    Recent inquiries and quotes for {history.customerEmail} inside the
                    current business.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-5 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoTile label="Past inquiries" value={`${history.inquiryCount}`} />
                    <InfoTile label="Past quotes" value={`${history.quoteCount}`} />
                    <InfoTile label="Recent shown" value={`${timeline.length}`} />
                  </div>

                  <Tabs className="min-h-0 flex-1 gap-4" defaultValue="all">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
                      <TabsTrigger value="quotes">Quotes</TabsTrigger>
                    </TabsList>

                    <TabsContent className="min-h-0 flex-1" value="all">
                      <ScrollArea className="h-[calc(100vh-17rem)] pr-4">
                        <DashboardDetailFeed>
                          {timeline.map((item) =>
                            item.kind === "inquiry" ? (
                              <DashboardDetailFeedItem
                                key={item.id}
                                action={<InquiryStatusBadge status={item.status} />}
                                meta={`Inquiry | Submitted ${formatInquiryDate(item.date)}`}
                                title={
                                  <Link
                                    className="inline-flex items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
                                    href={getBusinessInquiryPath(businessSlug, item.id)}
                                  >
                                    <FileText className="size-4 text-muted-foreground" />
                                    <span>{item.label}</span>
                                  </Link>
                                }
                              />
                            ) : (
                              <DashboardDetailFeedItem
                                key={item.id}
                                action={
                                  <div className="flex flex-wrap items-center gap-2">
                                    <QuoteStatusBadge status={item.status} />
                                    {item.postAcceptanceStatus !== "none" ? (
                                      <QuotePostAcceptanceStatusBadge
                                        status={item.postAcceptanceStatus}
                                      />
                                    ) : null}
                                  </div>
                                }
                                meta={`${formatQuoteMoney(item.amount, item.currency)} | Quote | Created ${formatInquiryDate(item.date)}`}
                                title={
                                  <Link
                                    className="inline-flex items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
                                    href={getBusinessQuotePath(businessSlug, item.id)}
                                  >
                                    <ReceiptText className="size-4 text-muted-foreground" />
                                    <span>
                                      {item.quoteNumber} | {item.label}
                                    </span>
                                  </Link>
                                }
                              />
                            ),
                          )}
                        </DashboardDetailFeed>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent className="min-h-0 flex-1" value="inquiries">
                      <ScrollArea className="h-[calc(100vh-17rem)] pr-4">
                        {history.inquiries.length ? (
                          <DashboardDetailFeed>
                            {history.inquiries.map((inquiry) => (
                              <DashboardDetailFeedItem
                                key={inquiry.id}
                                action={<InquiryStatusBadge status={inquiry.status} />}
                                meta={`Submitted ${formatInquiryDate(inquiry.submittedAt)}`}
                                title={
                                  <Link
                                    className="inline-flex items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
                                    href={getBusinessInquiryPath(businessSlug, inquiry.id)}
                                  >
                                    <FileText className="size-4 text-muted-foreground" />
                                    <span>{inquiry.serviceCategory}</span>
                                  </Link>
                                }
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
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent className="min-h-0 flex-1" value="quotes">
                      <ScrollArea className="h-[calc(100vh-17rem)] pr-4">
                        {history.quotes.length ? (
                          <DashboardDetailFeed>
                            {history.quotes.map((quote) => (
                              <DashboardDetailFeedItem
                                key={quote.id}
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
                                meta={`${formatQuoteMoney(quote.totalInCents, quote.currency)} | Created ${formatInquiryDate(quote.createdAt)}`}
                                title={
                                  <Link
                                    className="inline-flex items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
                                    href={getBusinessQuotePath(businessSlug, quote.id)}
                                  >
                                    <ReceiptText className="size-4 text-muted-foreground" />
                                    <span>
                                      {quote.quoteNumber} | {quote.title}
                                    </span>
                                  </Link>
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
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          description="This customer does not have other inquiry or quote records in the business yet."
          icon={History}
          title="No customer history"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}

function getCustomerHistoryTimeline(history: CustomerHistoryData): CustomerHistoryTimelineItem[] {
  return [
    ...history.inquiries.map((inquiry) => ({
      kind: "inquiry" as const,
      id: inquiry.id,
      label: inquiry.serviceCategory,
      status: inquiry.status,
      date: inquiry.submittedAt,
    })),
    ...history.quotes.map((quote) => ({
      kind: "quote" as const,
      id: quote.id,
      label: quote.title,
      status: quote.status,
      postAcceptanceStatus: quote.postAcceptanceStatus,
      amount: quote.totalInCents,
      currency: quote.currency,
      date: quote.createdAt,
      quoteNumber: quote.quoteNumber,
    })),
  ].sort((left, right) => right.date.getTime() - left.date.getTime());
}
