import Link from "next/link";
import { Download, ExternalLink, Mail, Printer } from "lucide-react";
import { notFound } from "next/navigation";

import {
  DashboardDetailLayout,
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardEmptyState,
  DashboardMetaPill,
  DashboardPage,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { Button } from "@/components/ui/button";
import {
  changeQuoteStatusAction,
  sendQuoteAction,
  updateQuotePostAcceptanceStatusAction,
  updateQuoteAction,
} from "@/features/quotes/actions";
import { CustomerHistoryPanel } from "@/features/customers/components/customer-history-panel";
import { getCustomerHistoryForBusiness } from "@/features/customers/queries";
import { CopyQuoteLinkButton } from "@/features/quotes/components/copy-quote-link-button";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuotePostAcceptanceForm } from "@/features/quotes/components/quote-post-acceptance-form";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteSendForm } from "@/features/quotes/components/quote-send-form";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { QuoteStatusForm } from "@/features/quotes/components/quote-status-form";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getQuoteDetailForBusiness } from "@/features/quotes/queries";
import { quoteRouteParamsSchema } from "@/features/quotes/schemas";
import {
  formatQuoteDate,
  formatQuoteDateTime,
  formatQuoteMoney,
  getPublicQuoteUrl,
  getQuoteEditorInitialValuesFromDetail,
} from "@/features/quotes/utils";
import {
  getBusinessInquiryPath,
  getBusinessQuotePdfExportPath,
  getBusinessQuotePrintPath,
} from "@/features/businesses/routes";
import { requireCurrentBusinessContext } from "@/lib/db/business-access";
import { env } from "@/lib/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type QuoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  const [resolvedParams, { businessContext }] = await Promise.all([
    params,
    requireCurrentBusinessContext(),
  ]);
  const parsedParams = quoteRouteParamsSchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    notFound();
  }
  const businessSlug = businessContext.business.slug;
  const [quote, pricingLibrary] = await Promise.all([
    getQuoteDetailForBusiness({
      businessId: businessContext.business.id,
      quoteId: parsedParams.data.id,
    }),
    getQuoteLibraryForBusiness(businessContext.business.id),
  ]);

  if (!quote) {
    notFound();
  }

  const updateAction = updateQuoteAction.bind(null, quote.id);
  const statusAction = changeQuoteStatusAction.bind(null, quote.id);
  const postAcceptanceAction = updateQuotePostAcceptanceStatusAction.bind(
    null,
    quote.id,
  );
  const sendAction = sendQuoteAction.bind(null, quote.id);
  const customerQuotePath = getPublicQuoteUrl(quote.publicToken);
  const customerQuoteUrl = new URL(
    customerQuotePath,
    env.BETTER_AUTH_URL,
  ).toString();
  const customerHistory = await getCustomerHistoryForBusiness({
    businessId: businessContext.business.id,
    customerEmail: quote.customerEmail,
    excludeQuoteId: quote.id,
  });
  const linkedInquiry = quote.linkedInquiry
    ? {
        id: quote.linkedInquiry.id,
        customerName: quote.linkedInquiry.customerName,
        customerEmail: quote.linkedInquiry.customerEmail,
        serviceCategory: quote.linkedInquiry.serviceCategory,
        status: quote.linkedInquiry.status,
      }
    : null;

  const linkedInquirySection = (
    <DashboardSection
      description="Original inquiry context."
      footer={
        quote.linkedInquiry ? (
          <Button asChild variant="outline">
            <Link href={getBusinessInquiryPath(businessSlug, quote.linkedInquiry.id)}>
              Open inquiry
            </Link>
          </Button>
        ) : null
      }
      title="Linked inquiry"
    >
      {quote.linkedInquiry ? (
        <div className="flex flex-col gap-4">
          <DashboardDetailFeed>
            <DashboardDetailFeedItem
              action={
                <DashboardMetaPill className="capitalize">
                  {quote.linkedInquiry.status}
                </DashboardMetaPill>
              }
              meta={
                <>
                  <span>{quote.linkedInquiry.customerEmail}</span>
                  <span aria-hidden="true">|</span>
                  <span>{quote.linkedInquiry.serviceCategory}</span>
                </>
              }
              title={quote.linkedInquiry.customerName}
            />
          </DashboardDetailFeed>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Category" value={quote.linkedInquiry.serviceCategory} />
            <InfoTile label="Inquiry status" value={quote.linkedInquiry.status} />
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          description="This quote was created manually. Continue editing here or share the customer view when it is ready."
          title="No linked inquiry"
          variant="section"
        />
      )}
    </DashboardSection>
  );

  const activitySection = (
    <DashboardSection
      description="Quote events and owner actions."
      title="Activity log"
    >
      {quote.activities.length ? (
        <DashboardDetailFeed>
          {quote.activities.map((activity) => (
            <DashboardDetailFeedItem
              key={activity.id}
              meta={
                <>
                  <span>{activity.actorName ?? "Requo"}</span>
                  <span aria-hidden="true">|</span>
                  <span>{formatQuoteDateTime(activity.createdAt)}</span>
                </>
              }
              title={activity.summary}
            />
          ))}
        </DashboardDetailFeed>
      ) : (
        <DashboardEmptyState
          description="Send the quote or change its status to start the timeline for this quote."
          title="No quote activity yet"
          variant="section"
        />
      )}
    </DashboardSection>
  );

  return (
    <DashboardPage>
      <DashboardDetailHeader
        eyebrow="Quote detail"
        title={quote.title}
        description={`Prepared for ${quote.customerName}.`}
        meta={
          <>
            <QuoteStatusBadge status={quote.status} />
            <DashboardMetaPill className="text-foreground">
              {quote.quoteNumber}
            </DashboardMetaPill>
            <DashboardMetaPill>
              Valid until {formatQuoteDate(quote.validUntil)}
            </DashboardMetaPill>
            <DashboardMetaPill>
              {quote.inquiryId ? "Linked inquiry" : "Manual quote"}
            </DashboardMetaPill>
            {quote.postAcceptanceStatus !== "none" ? (
              <QuotePostAcceptanceStatusBadge status={quote.postAcceptanceStatus} />
            ) : null}
          </>
        }
        actions={
          <div className="dashboard-actions">
            <Button asChild variant="outline">
              <a href={getBusinessQuotePdfExportPath(businessSlug, quote.id)}>
                <Download data-icon="inline-start" />
                Export PDF
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={getBusinessQuotePrintPath(businessSlug, quote.id)}
                prefetch={false}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Printer data-icon="inline-start" />
                Print
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${quote.customerEmail}`}>
                <Mail data-icon="inline-start" />
                Email customer
              </a>
            </Button>
          </div>
        }
      />

      {quote.status === "draft" ? (
        <>
          <QuoteEditor
            action={updateAction}
            businessName={businessContext.business.name}
            currency={quote.currency}
            initialValues={getQuoteEditorInitialValuesFromDetail(quote)}
            linkedInquiry={linkedInquiry}
            pricingLibrary={pricingLibrary}
            quoteNumber={quote.quoteNumber}
            submitLabel="Save draft quote"
            submitPendingLabel="Saving draft..."
          />

          <DashboardDetailLayout className="xl:grid-cols-[1.25fr_0.75fr]">
            <DashboardSidebarStack>
              {linkedInquirySection}
              {activitySection}
              <CustomerHistoryPanel
                history={customerHistory}
                businessSlug={businessSlug}
              />
            </DashboardSidebarStack>

            <DashboardSidebarStack>
              <DashboardSection
                description="Email the finished draft once the totals are final."
                title="Send quote"
              >
                <QuoteSendForm
                  action={sendAction}
                  customerEmail={quote.customerEmail}
                />
              </DashboardSection>

              <DashboardSection
                description="Move the quote through its lifecycle."
                title="Status"
              >
                <QuoteStatusForm
                  key={quote.status}
                  action={statusAction}
                  currentStatus={quote.status}
                />
              </DashboardSection>

              <DashboardSection
                contentClassName="grid gap-3 sm:grid-cols-2"
                description="Key commercial details before sending."
                title="Draft summary"
              >
                <InfoTile label="Quote number" value={quote.quoteNumber} />
                <InfoTile
                  label="Valid until"
                  value={formatQuoteDate(quote.validUntil)}
                />
                <InfoTile label="Customer" value={quote.customerName} />
                <InfoTile
                  label="Current total"
                  value={formatQuoteMoney(quote.totalInCents, quote.currency)}
                />
              </DashboardSection>
            </DashboardSidebarStack>
          </DashboardDetailLayout>
        </>
      ) : (
        <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
          <DashboardSidebarStack>
            {quote.reminders.includes("follow_up_due") ? (
              <Alert>
                <AlertTitle>Follow up due</AlertTitle>
                <AlertDescription>
                  This sent quote has been waiting at least 3 days without a customer response.
                </AlertDescription>
              </Alert>
            ) : null}

            {quote.reminders.includes("expiring_soon") ? (
              <Alert>
                <AlertTitle>Quote expiring soon</AlertTitle>
                <AlertDescription>
                  This quote expires on {formatQuoteDate(quote.validUntil)}.
                </AlertDescription>
              </Alert>
            ) : null}

            <QuotePreview
              businessName={businessContext.business.name}
              quoteNumber={quote.quoteNumber}
              title={quote.title}
              customerName={quote.customerName}
              customerEmail={quote.customerEmail}
              currency={quote.currency}
              validUntil={quote.validUntil}
              notes={quote.notes}
              items={quote.items}
              subtotalInCents={quote.subtotalInCents}
              discountInCents={quote.discountInCents}
              totalInCents={quote.totalInCents}
            />

            {linkedInquirySection}
            {activitySection}
            <CustomerHistoryPanel
              history={customerHistory}
              businessSlug={businessSlug}
            />
          </DashboardSidebarStack>

          <DashboardSidebarStack>
            <DashboardSection
              contentClassName="grid gap-3 sm:grid-cols-2"
              description="Key totals and lifecycle dates."
              title="Commercial summary"
            >
              <InfoTile
                label="Subtotal"
                value={formatQuoteMoney(quote.subtotalInCents, quote.currency)}
              />
              <InfoTile
                label="Discount"
                value={formatQuoteMoney(quote.discountInCents, quote.currency)}
              />
              <InfoTile
                label="Total"
                value={formatQuoteMoney(quote.totalInCents, quote.currency)}
              />
              <InfoTile
                label="Valid until"
                value={formatQuoteDate(quote.validUntil)}
              />
              <InfoTile
                label="Sent"
                value={
                  quote.sentAt ? formatQuoteDateTime(quote.sentAt) : "Not sent"
                }
              />
              <InfoTile
                label="Accepted"
                value={
                  quote.acceptedAt
                    ? formatQuoteDateTime(quote.acceptedAt)
                    : "Not accepted"
                }
              />
            </DashboardSection>

            <DashboardSection
              contentClassName="flex flex-col gap-4"
              description="Share and track the public quote."
              title="Customer view"
            >
              <div className="soft-panel px-4 py-4 shadow-none">
                <p className="text-sm font-medium text-foreground">
                  {quote.status === "sent"
                    ? "Waiting for a customer response"
                    : `Quote ${quote.status}`}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {quote.status === "sent"
                    ? "The customer can review the quote and respond from the secure public page."
                    : "The public quote remains available for review, but it is no longer accepting a new online response."}
                </p>
                {quote.sentAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sent on {formatQuoteDateTime(quote.sentAt)}.
                  </p>
                ) : null}
              </div>

              <div className="soft-panel px-4 py-4 shadow-none">
                <p className="meta-label">Public quote URL</p>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {customerQuoteUrl}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile
                  label="Last viewed"
                  value={
                    quote.publicViewedAt
                      ? formatQuoteDateTime(quote.publicViewedAt)
                      : "Not viewed yet"
                  }
                />
                <InfoTile
                  label="Customer response"
                  value={
                    quote.customerRespondedAt
                      ? formatQuoteDateTime(quote.customerRespondedAt)
                      : "No response yet"
                  }
                />
              </div>

              {quote.reminders.length ? (
                <div className="flex flex-wrap gap-2">
                  {quote.reminders.map((reminder) => (
                    <QuoteReminderBadge key={reminder} kind={reminder} />
                  ))}
                </div>
              ) : null}

              {quote.customerResponseMessage ? (
                <div className="soft-panel px-4 py-4 shadow-none">
                  <p className="meta-label">Customer message</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {quote.customerResponseMessage}
                  </p>
                </div>
              ) : null}

              <div className="dashboard-actions [&>*]:w-full sm:[&>*]:w-auto">
                <CopyQuoteLinkButton url={customerQuoteUrl} />
                <Button asChild variant="outline">
                  <Link href={customerQuotePath} prefetch={false} target="_blank">
                    Open customer view
                    <ExternalLink data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </DashboardSection>

            <DashboardSection
              description="Move the quote through its lifecycle."
              title="Status"
            >
              <QuoteStatusForm
                key={quote.status}
                action={statusAction}
                currentStatus={quote.status}
              />
            </DashboardSection>

            {quote.status === "accepted" ? (
              <DashboardSection
                description="Track the handoff after the customer says yes."
                title="Post-acceptance"
              >
                <QuotePostAcceptanceForm
                  key={quote.postAcceptanceStatus}
                  action={postAcceptanceAction}
                  currentStatus={quote.postAcceptanceStatus}
                />
              </DashboardSection>
            ) : null}
          </DashboardSidebarStack>
        </DashboardDetailLayout>
      )}
    </DashboardPage>
  );
}
