import Link from "next/link";
import { ExternalLink, Mail, Printer } from "lucide-react";
import { notFound, redirect } from "next/navigation";

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
import { AddToCalendarButton } from "@/features/calendar/components/add-to-calendar-button";
import { CalendarEventSummary } from "@/features/calendar/components/calendar-event-summary";
import { prefillFromQuote, prefillFromAcceptedQuote } from "@/features/calendar/prefill";
import { getCalendarConnectionForUser, getCalendarEventsForQuote } from "@/features/calendar/queries";
import {
  archiveQuoteAction,
  deleteDraftQuoteAction,
  restoreArchivedQuoteAction,
  sendQuoteAction,
  updateQuotePostAcceptanceStatusAction,
  updateQuoteAction,
  voidQuoteAction,
} from "@/features/quotes/actions";
import { CustomerHistoryPanel } from "@/features/customers/components/customer-history-panel";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { QuoteActivityPanel } from "@/features/quotes/components/quote-activity-panel";
import { getCustomerHistoryForBusiness } from "@/features/customers/queries";
import { CopyQuoteLinkButton } from "@/features/quotes/components/copy-quote-link-button";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { QuoteExportPopover } from "@/features/quotes/components/quote-export-popover";
import { QuoteLifecycleActions } from "@/features/quotes/components/quote-lifecycle-actions";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuotePostAcceptanceForm } from "@/features/quotes/components/quote-post-acceptance-form";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { QuoteRecordStateBadge } from "@/features/quotes/components/quote-record-state-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { QuoteSendForm } from "@/features/quotes/components/quote-send-form";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
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
  getBusinessQuoteExportPath,
  getBusinessQuotePrintPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { env, isGoogleCalendarConfigured } from "@/lib/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type QuoteDetailPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  const [session, resolvedParams] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    resolvedParams.slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

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
  const archiveAction = archiveQuoteAction.bind(null, quote.id);
  const deleteDraftAction = deleteDraftQuoteAction.bind(null, quote.id);
  const postAcceptanceAction = updateQuotePostAcceptanceStatusAction.bind(
    null,
    quote.id,
  );
  const restoreArchivedAction = restoreArchivedQuoteAction.bind(null, quote.id);
  const sendAction = sendQuoteAction.bind(null, quote.id);
  const voidAction = voidQuoteAction.bind(null, quote.id);
  const customerQuotePath = getPublicQuoteUrl(quote.publicToken);
  const customerQuoteUrl = new URL(
    customerQuotePath,
    env.BETTER_AUTH_URL,
  ).toString();
  const customerHistory = await getCustomerHistoryForBusiness({
    businessId: businessContext.business.id,
    customerEmail: quote.customerEmail,
    excludeInquiryId: quote.inquiryId,
    excludeQuoteId: quote.id,
  });

  const [calendarConnection, calendarEvents] = await Promise.all([
    isGoogleCalendarConfigured
      ? getCalendarConnectionForUser(session.user.id)
      : Promise.resolve({ connected: false, googleEmail: null, selectedCalendarId: null }),
    isGoogleCalendarConfigured
      ? getCalendarEventsForQuote(businessContext.business.id, quote.id)
      : Promise.resolve([]),
  ]);

  const calendarPrefill = isGoogleCalendarConfigured
    ? (quote.status === "accepted"
        ? prefillFromAcceptedQuote
        : prefillFromQuote)(
        {
          title: quote.title,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          publicToken: quote.publicToken,
        },
        {
          name: businessContext.business.name,
          contactEmail: null,
        },
        env.BETTER_AUTH_URL,
      )
    : null;

  const linkedInquiry = quote.linkedInquiry
    ? {
        id: quote.linkedInquiry.id,
        customerName: quote.linkedInquiry.customerName,
        customerEmail: quote.linkedInquiry.customerEmail,
        recordState: quote.linkedInquiry.recordState,
        serviceCategory: quote.linkedInquiry.serviceCategory,
        status: quote.linkedInquiry.status,
      }
    : null;
  const isArchived = quote.archivedAt !== null;

  const customerViewCopy =
    quote.status === "sent"
      ? {
          title: "Waiting for a customer response",
          description:
            "The customer can review the quote and respond from the secure public page.",
        }
      : quote.status === "voided"
        ? {
            title: "Quote voided",
            description:
              "The public quote stays readable for reference, but it is no longer accepting online responses.",
          }
        : {
            title: `Quote ${quote.status}`,
            description:
              "The public quote remains available for review, but it is no longer accepting a new online response.",
          };
  const lifecycleSectionDescription =
    quote.status === "sent"
      ? "Use void for sent quotes and archive for safe cleanup."
      : "Preserve the quote history and archive it when you want to hide it from active lists.";

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
                <div className="flex flex-wrap items-center gap-2">
                  <InquiryStatusBadge status={quote.linkedInquiry.status} />
                  {quote.linkedInquiry.recordState !== "active" ? (
                    <InquiryRecordStateBadge
                      state={quote.linkedInquiry.recordState}
                    />
                  ) : null}
                </div>
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

  return (
    <DashboardPage>
      <DashboardDetailHeader
        eyebrow="Quote detail"
        title={quote.title}
        description={`Prepared for ${quote.customerName}.`}
        meta={
          <>
            <QuoteStatusBadge status={quote.status} />
            {isArchived ? <QuoteRecordStateBadge state="archived" /> : null}
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
          <div className="flex flex-nowrap items-center gap-2.5">
            {isGoogleCalendarConfigured && calendarPrefill ? (
              <AddToCalendarButton
                businessId={businessContext.business.id}
                connected={calendarConnection.connected}
                prefill={calendarPrefill}
                quoteId={quote.id}
              />
            ) : null}
            <QuoteExportPopover
              pdfHref={getBusinessQuoteExportPath(businessSlug, quote.id, "pdf")}
              pngHref={getBusinessQuoteExportPath(businessSlug, quote.id, "png")}
            />
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
            <Button asChild>
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
            key={quote.id}
            linkedInquiry={linkedInquiry}
            pricingLibrary={pricingLibrary}
            quoteNumber={quote.quoteNumber}
            showFloatingUnsavedChanges
            submitLabel="Save changes"
            submitPendingLabel="Saving changes..."
          />

          <DashboardDetailLayout className="xl:grid-cols-[1.25fr_0.75fr]">
            <DashboardSidebarStack>
              {linkedInquirySection}
              <QuoteActivityPanel activities={quote.activities} />
              <CustomerHistoryPanel
                history={customerHistory}
                businessSlug={businessSlug}
              />
            </DashboardSidebarStack>

            <DashboardSidebarStack>
              <DashboardSection
                description="Send the finished draft with Requo or share the customer link yourself."
                title="Send quote"
              >
                <QuoteSendForm
                  action={sendAction}
                  customerQuoteUrl={customerQuoteUrl}
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

              <DashboardSection
                description="Delete unneeded drafts before they enter the quote lifecycle."
                title="Draft actions"
              >
                <QuoteLifecycleActions
                  archiveAction={archiveAction}
                  businessQuoteListHref={getBusinessQuotesPath(businessSlug)}
                  deleteDraftAction={deleteDraftAction}
                  isArchived={isArchived}
                  restoreArchivedAction={restoreArchivedAction}
                  status={quote.status}
                  voidAction={voidAction}
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
            <QuoteActivityPanel activities={quote.activities} />
            <CustomerHistoryPanel
              history={customerHistory}
              businessSlug={businessSlug}
            />
          </DashboardSidebarStack>

          <DashboardSidebarStack>
            <DashboardSection
              contentClassName="!grid !grid-cols-2 gap-3"
              description="Key totals and lifecycle dates."
              title="Summary"
            >
              <InfoTile
                label="Total"
                value={formatQuoteMoney(quote.totalInCents, quote.currency)}
              />
              <InfoTile
                label="Discount"
                value={formatQuoteMoney(quote.discountInCents, quote.currency)}
              />
              <InfoTile
                label="Valid until"
                value={formatQuoteDate(quote.validUntil)}
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
                  {customerViewCopy.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {customerViewCopy.description}
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

            {isGoogleCalendarConfigured ? (
              <CalendarEventSummary events={calendarEvents} />
            ) : null}

            <DashboardSection
              description={lifecycleSectionDescription}
              title="Lifecycle"
            >
              <QuoteLifecycleActions
                archiveAction={archiveAction}
                businessQuoteListHref={getBusinessQuotesPath(businessSlug)}
                deleteDraftAction={deleteDraftAction}
                isArchived={isArchived}
                restoreArchivedAction={restoreArchivedAction}
                status={quote.status}
                voidAction={voidAction}
              />
            </DashboardSection>
          </DashboardSidebarStack>
        </DashboardDetailLayout>
      )}
    </DashboardPage>
  );
}
