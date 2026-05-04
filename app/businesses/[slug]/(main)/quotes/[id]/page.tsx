import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AtSign, ExternalLink, Mail, Printer } from "lucide-react";
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
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  archiveQuoteAction,
  cancelAcceptedQuoteAction,
  completeAcceptedQuoteAction,
  createPostWinChecklistItemAction,
  deleteDraftQuoteAction,
  logQuoteSendEventAction,
  restoreArchivedQuoteAction,
  sendQuoteAction,
  togglePostWinChecklistItemAction,
  updateQuotePostAcceptanceStatusAction,
  updateQuoteAction,
  voidQuoteAction,
} from "@/features/quotes/actions";
import { CustomerHistoryPanel } from "@/features/customers/components/customer-history-panel";
import { createQuoteFollowUpAction } from "@/features/follow-ups/actions";
import { FollowUpPanel } from "@/features/follow-ups/components/follow-up-panel";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import {
  inquiryContactMethodLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";
import { getCustomerHistoryForBusiness } from "@/features/customers/queries";
import { CopyQuoteLinkButton } from "@/features/quotes/components/copy-quote-link-button";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { QuoteExportPopover } from "@/features/quotes/components/quote-export-popover";
import { QuoteLifecycleActions } from "@/features/quotes/components/quote-lifecycle-actions";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { QuotePostAcceptanceStatusBadge } from "@/features/quotes/components/quote-post-acceptance-status-badge";
import { QuotePostWinPanel } from "@/features/quotes/components/quote-post-win-panel";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { QuoteRecordStateBadge } from "@/features/quotes/components/quote-record-state-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { DismissibleQuoteAlert } from "@/features/quotes/components/dismissible-quote-alert";
import { SendQuoteDialog } from "@/features/quotes/components/send-quote-dialog";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { getFollowUpsForQuote } from "@/features/follow-ups/queries";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getQuoteDetailForBusiness } from "@/features/quotes/queries";
import { quoteRouteParamsSchema } from "@/features/quotes/schemas";
import type { DashboardQuoteActivity } from "@/features/quotes/types";
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
import { env, isEmailConfigured } from "@/lib/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

const QuoteAiPanel = dynamic(
  () =>
    import("@/features/ai/components/quote-ai-panel").then(
      (module) => module.QuoteAiPanel,
    ),
  {
    loading: () => (
      <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
        <div className="flex size-14 items-center justify-center rounded-full border border-border/70 bg-[var(--surface-elevated-bg)] shadow-[var(--surface-shadow-lg)]">
          <Image
            src="/logo.svg"
            alt=""
            width={34}
            height={34}
            className="size-[2.15rem] object-contain"
          />
          <span className="sr-only">Loading Requo assistant</span>
        </div>
      </div>
    ),
  },
);

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
  const cancelAction = cancelAcceptedQuoteAction.bind(null, quote.id);
  const completeAction = completeAcceptedQuoteAction.bind(null, quote.id);
  const restoreArchivedAction = restoreArchivedQuoteAction.bind(null, quote.id);
  const sendAction = sendQuoteAction.bind(null, quote.id);
  const logEventAction = logQuoteSendEventAction.bind(null, quote.id);
  const createFollowUpAction = createQuoteFollowUpAction.bind(null, quote.id);
  const voidAction = voidQuoteAction.bind(null, quote.id);
  const customerQuotePath = quote.publicToken
    ? getPublicQuoteUrl(quote.publicToken)
    : null;
  const customerQuoteUrl = customerQuotePath
    ? new URL(customerQuotePath, env.BETTER_AUTH_URL).toString()
    : null;
  const [customerHistory, followUps] = await Promise.all([
    getCustomerHistoryForBusiness({
      businessId: businessContext.business.id,
      customerEmail: quote.customerEmail,
      customerContactHandle: quote.customerContactHandle,
      excludeInquiryId: quote.inquiryId,
      excludeQuoteId: quote.id,
    }),
    getFollowUpsForQuote({
      businessId: businessContext.business.id,
      quoteId: quote.id,
    }),
  ]);



  const linkedInquiry = quote.linkedInquiry
    ? {
        id: quote.linkedInquiry.id,
        customerName: quote.linkedInquiry.customerName,
        customerEmail: quote.linkedInquiry.customerEmail,
        customerContactMethod: quote.linkedInquiry.customerContactMethod,
        customerContactHandle: quote.linkedInquiry.customerContactHandle,
        recordState: quote.linkedInquiry.recordState,
        serviceCategory: quote.linkedInquiry.serviceCategory,
        status: quote.linkedInquiry.status,
      }
    : null;
  const isArchived = quote.archivedAt !== null;
  const hasPendingFollowUp = followUps.some(
    (followUp) => followUp.status === "pending",
  );
  const viewedWithoutResponse = Boolean(
    quote.status === "sent" &&
      quote.publicViewedAt &&
      !quote.customerRespondedAt,
  );
  const visibleQuoteReminders = quote.reminders.filter(
    (reminder) => reminder !== "follow_up_due",
  );
  const quoteNextAction =
    isArchived
      ? null
      : quote.status === "draft"
        ? {
            title: "Next: send this quote",
            description:
              "Finish any edits, then share the customer quote page and set a follow-up reminder.",
          }
        : viewedWithoutResponse && !hasPendingFollowUp
          ? {
              title: "Next: follow up on the viewed quote",
              description:
                "The customer viewed this quote but has not accepted or rejected it. Set a follow-up reminder before it goes cold.",
            }
          : quote.status === "sent" && !hasPendingFollowUp
            ? {
                title: "Next: set a follow-up reminder",
                description:
                  "This quote is shared and waiting for a response. Schedule the next customer touchpoint.",
              }
            : quote.status === "sent"
              ? {
                  title: "Next: work the scheduled follow-up",
                  description:
                    "A follow-up is already planned. Keep the quote open until the customer responds.",
                }
              : quote.status === "accepted" && quote.postAcceptanceStatus === "completed"
                ? {
                    title: "Work completed",
                    description:
                      "This job has been fulfilled. The quote and work history are preserved.",
                  }
                : quote.status === "accepted" && quote.postAcceptanceStatus === "canceled"
                  ? {
                      title: "Canceled after acceptance",
                      description:
                        "This accepted quote was canceled. The quote record stays accepted for historical accuracy.",
                    }
                  : quote.status === "accepted"
                    ? {
                        title: "Next: schedule or book the work",
                        description:
                          "The customer accepted this quote. Track the handoff so the job does not stall.",
                      }
                    : null;

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
  const quoteContactEmail = getCustomerContactEmail(quote);
  const showQuotePreferredContact = shouldShowPreferredContactTile(quote);
  const quotePreferredContactLabel = getContactMethodLabel(
    quote.customerContactMethod,
  );

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
                  <TruncatedTextWithTooltip
                    className="max-w-52"
                    text={
                      getCustomerContactEmail(quote.linkedInquiry) ??
                      quote.linkedInquiry.customerContactHandle
                    }
                  />
                  <span aria-hidden="true">|</span>
                  <TruncatedTextWithTooltip
                    className="max-w-52"
                    text={quote.linkedInquiry.serviceCategory}
                  />
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
    <DashboardPage className="pb-24">
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
          <div className="grid w-full gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">

            <QuoteExportPopover
              canExport={hasFeatureAccess(businessContext.business.workspacePlan, "exports")}
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
            {quote.status === "draft" ? (
              <SendQuoteDialog
                sendAction={sendAction}
                logEventAction={logEventAction}
                createFollowUpAction={createFollowUpAction}
                quote={quote}
                customerQuoteUrl={customerQuoteUrl}
                businessName={businessContext.business.name}
                isRequoEmailAvailable={
                  isEmailConfigured &&
                  quote.customerContactMethod === "email" &&
                  !!quote.customerEmail
                }
                pdfExportHref={getBusinessQuoteExportPath(
                  businessSlug,
                  quote.id,
                  "pdf",
                )}
              />
            ) : null}
          </div>
        }
      />

      {quoteNextAction ? (
        <DismissibleQuoteAlert
          id={`quote-${quote.id}-next-action`}
          title={quoteNextAction.title}
          description={quoteNextAction.description}
        />
      ) : null}

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
              <QuoteActivitySheetSection activities={quote.activities} />
              <CustomerHistorySheetSection
                history={customerHistory}
                businessSlug={businessSlug}
              />
            </DashboardSidebarStack>

            <DashboardSidebarStack>
              <DashboardSection
                description="Send the finished draft to your customer."
                title="Send quote"
              >
                <SendQuoteDialog
                  sendAction={sendAction}
                  logEventAction={logEventAction}
                  createFollowUpAction={createFollowUpAction}
                  quote={quote}
                  customerQuoteUrl={customerQuoteUrl}
                  businessName={businessContext.business.name}
                  isRequoEmailAvailable={isEmailConfigured && quote.customerContactMethod === "email" && !!quote.customerEmail}
                  pdfExportHref={getBusinessQuoteExportPath(businessSlug, quote.id, "pdf")}
                />
              </DashboardSection>

              <FollowUpPanel
                businessSlug={businessSlug}
                createAction={createFollowUpAction}
                ctaDescription="Set a reminder to check back after sharing this quote."
                defaultChannel={quote.customerContactMethod}
                defaultReason="Follow up with the customer about this quote if they have not responded."
                defaultTitle={`Follow up on quote ${quote.quoteNumber}`}
                followUps={followUps}
                sharedQuoteWithoutFollowUp={false}
              />



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
            <QuoteActivitySheetSection activities={quote.activities} />
            <CustomerHistorySheetSection
              history={customerHistory}
              businessSlug={businessSlug}
            />
          </DashboardSidebarStack>

          <DashboardSidebarStack>
            <DashboardSection
              contentClassName="grid gap-3 sm:grid-cols-2"
              description="Saved customer channel for sending and follow-up."
              title="Customer contact"
            >
              <InfoTile
                className={showQuotePreferredContact ? undefined : "sm:col-span-2"}
                icon={Mail}
                label="Email"
                value={
                  quoteContactEmail ? (
                    <TruncatedTextWithTooltip
                      className="underline-offset-4 hover:underline"
                      href={`mailto:${quoteContactEmail}`}
                      prefetch={false}
                      text={quoteContactEmail}
                    />
                  ) : (
                    "Not provided"
                  )
                }
                valueClassName="break-all"
              />
              {showQuotePreferredContact ? (
                <InfoTile
                  icon={AtSign}
                  label={quotePreferredContactLabel}
                  value={quote.customerContactHandle}
                  valueClassName="break-all"
                />
              ) : null}
            </DashboardSection>

            <DashboardSection
              contentClassName="flex flex-col gap-4"
              description="Share, open, and track the secure quote page."
              title="Customer view"
            >
              {customerQuoteUrl ? (
                <>
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
                    <TruncatedTextWithTooltip
                      className="mt-2 break-all text-sm text-muted-foreground"
                      lines={2}
                      text={customerQuoteUrl}
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertTitle>Customer link unavailable</AlertTitle>
                  <AlertDescription>
                    Requo couldn&apos;t recover the secure customer link for this quote,
                    so public sharing is temporarily unavailable.
                  </AlertDescription>
                </Alert>
              )}

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

              {visibleQuoteReminders.length ? (
                <div className="flex flex-wrap gap-2">
                  {visibleQuoteReminders.map((reminder) => (
                    <QuoteReminderBadge key={reminder} kind={reminder} />
                  ))}
                </div>
              ) : null}

              {quote.customerResponseMessage ? (
                <div className="soft-panel px-4 py-4 shadow-none">
                  <p className="meta-label">Customer message</p>
                  <TruncatedTextWithTooltip
                    className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground"
                    lines={6}
                    text={quote.customerResponseMessage}
                  />
                </div>
              ) : null}

              {customerQuoteUrl && customerQuotePath ? (
                <div className="dashboard-actions [&>*]:w-full sm:[&>*]:w-auto">
                  <CopyQuoteLinkButton url={customerQuoteUrl} />
                  <Button asChild variant="outline">
                    <Link href={customerQuotePath} prefetch={false} target="_blank">
                      Open customer view
                      <ExternalLink data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </DashboardSection>

            <FollowUpPanel
              businessSlug={businessSlug}
              createAction={createFollowUpAction}
              ctaDescription={
                viewedWithoutResponse
                  ? "Set a reminder to follow up now that the customer has viewed this quote."
                  : "Set a reminder to check back after sharing this quote."
              }
              defaultChannel={quote.customerContactMethod}
              defaultReason={
                viewedWithoutResponse
                  ? "Follow up because the customer viewed this quote but has not responded."
                  : "Follow up with the customer about this quote if they have not responded."
              }
              defaultTitle={`Follow up on quote ${quote.quoteNumber}`}
              followUps={followUps}
              sharedQuoteWithoutFollowUp={quote.status === "sent" && !hasPendingFollowUp}
            />



            {visibleQuoteReminders.includes("expiring_soon") ? (
              <DismissibleQuoteAlert
                id={`quote-${quote.id}-expiring`}
                title="Quote expiring soon"
                description={`This quote expires on ${formatQuoteDate(quote.validUntil)}.`}
              />
            ) : null}

            {quote.status === "accepted" ? (
              <QuotePostWinSheetSection
                key={quote.postAcceptanceStatus}
                quoteId={quote.id}
                quoteNumber={quote.quoteNumber}
                customerName={quote.customerName}
                totalInCents={quote.totalInCents}
                currency={quote.currency}
                acceptedAt={quote.acceptedAt}
                completedAt={quote.completedAt}
                canceledAt={quote.canceledAt}
                cancellationReason={quote.cancellationReason}
                cancellationNote={quote.cancellationNote}
                postAcceptanceStatus={quote.postAcceptanceStatus}
                checklistItems={quote.checklistItems}
                postAcceptanceAction={postAcceptanceAction}
                cancelAction={cancelAction}
                completeAction={completeAction}
                toggleChecklistItemAction={togglePostWinChecklistItemAction}
                createChecklistItemAction={createPostWinChecklistItemAction}
              />
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
      <QuoteAiPanel
        businessSlug={businessSlug}
        quoteId={quote.id}
        userName={session.user.name || "You"}
        workspacePlan={businessContext.business.workspacePlan}
      />
    </DashboardPage>
  );
}

function QuoteActivitySheetSection({
  activities,
}: {
  activities: DashboardQuoteActivity[];
}) {
  const latestActivity = activities[0];

  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Quote events and owner actions."
      title="Activity log"
    >
      {latestActivity ? (
        <>
          <DashboardDetailFeed>
            <DashboardDetailFeedItem
              meta={
                <>
                  <span>{latestActivity.actorName ?? "Requo"}</span>
                  <span aria-hidden="true">|</span>
                  <span>{formatQuoteDateTime(latestActivity.createdAt)}</span>
                </>
              }
              title={latestActivity.summary}
            />
          </DashboardDetailFeed>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full" type="button" variant="outline">
                View all activity
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>Quote activity</SheetTitle>
                <SheetDescription>
                  Full timeline of events and owner actions for this quote.
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="min-h-0 flex-1">
                <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                  <DashboardDetailFeed>
                    {activities.map((activity) => (
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
                </ScrollArea>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <DashboardEmptyState
          description="Send the quote or change its status to start the timeline for this quote."
          title="No quote activity yet"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}

function CustomerHistorySheetSection({
  businessSlug,
  history,
}: Parameters<typeof CustomerHistoryPanel>[0]) {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Past records for this customer email inside the current business."
      title="Customer history"
    >
      {history ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Past inquiries" value={`${history.inquiryCount}`} />
            <InfoTile label="Past quotes" value={`${history.quoteCount}`} />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full" type="button" variant="outline">
                View customer history
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>Customer history</SheetTitle>
                <SheetDescription>
                  Past inquiries and quotes for this customer.
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="min-h-0 flex-1">
                <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                  <CustomerHistoryPanel
                    businessSlug={businessSlug}
                    history={history}
                  />
                </ScrollArea>
              </SheetBody>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <DashboardEmptyState
          description="No prior inquiries or quotes were found for this customer."
          title="No customer history"
          variant="section"
        />
      )}
    </DashboardSection>
  );
}

function QuotePostWinSheetSection(props: Parameters<typeof QuotePostWinPanel>[0]) {
  const completedCount = props.checklistItems.filter(
    (item) => item.completedAt,
  ).length;
  const totalItems = props.checklistItems.length;

  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Post-acceptance next steps."
      title="Post-win"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          label="Accepted total"
          value={formatQuoteMoney(props.totalInCents, props.currency)}
        />
        <InfoTile
          label="Checklist"
          value={
            totalItems ? `${completedCount}/${totalItems} complete` : "No items"
          }
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <QuotePostAcceptanceStatusBadge status={props.postAcceptanceStatus} />
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button className="w-full" type="button" variant="outline">
            Open post-win actions
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Post-win next steps</SheetTitle>
            <SheetDescription>
              Manage checklist items, completion, and accepted-work cancellation.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="min-h-0 flex-1">
            <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
              <QuotePostWinPanel {...props} />
            </ScrollArea>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </DashboardSection>
  );
}

function getContactMethodLabel(method: string) {
  const normalized = method.trim().toLowerCase();

  if (normalized in inquiryContactMethodLabels) {
    return inquiryContactMethodLabels[normalized as InquiryContactMethod];
  }

  return method.trim() || "Contact details";
}

function getCustomerContactEmail(contact: {
  customerEmail: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
}) {
  const savedEmail = contact.customerEmail?.trim();

  if (savedEmail) {
    return savedEmail;
  }

  if (contact.customerContactMethod.trim().toLowerCase() === "email") {
    return contact.customerContactHandle.trim() || null;
  }

  return null;
}

function shouldShowPreferredContactTile(contact: {
  customerContactMethod: string;
  customerContactHandle: string;
}) {
  return (
    contact.customerContactHandle.trim().length > 0 &&
    contact.customerContactMethod.trim().toLowerCase() !== "email"
  );
}
