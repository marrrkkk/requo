import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  AtSign,
  FileText,
  Mail,
  Printer,
  ReceiptText,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

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
import { DashboardDetailPageSkeleton } from "@/components/shell/dashboard-detail-page-skeleton";
import { ProFeatureNoticeButton } from "@/components/shared/pro-feature-notice-button";
import { TruncatedTextWithTooltip } from "@/components/shared/truncated-text-with-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { InfoTile } from "@/components/shared/info-tile";
import { CustomerHistoryPanel } from "@/features/customers/components/customer-history-panel";
import { WorkflowNextActionCallout } from "@/features/businesses/components/workflow-next-action";
import { getInquiryNextAction } from "@/features/businesses/workflow-next-actions";
import { getCustomerHistoryForBusiness } from "@/features/customers/queries";
import { createInquiryFollowUpAction } from "@/features/follow-ups/actions";
import { FollowUpPanel } from "@/features/follow-ups/components/follow-up-panel";
import { getFollowUpsForInquiry } from "@/features/follow-ups/queries";
import {
  getCustomSubmittedFields,
  inquiryContactMethodLabels,
  systemFieldDefaultLabels,
  type InquiryContactMethod,
} from "@/features/inquiries/form-config";
import {
  addInquiryNoteAction,
  archiveInquiryAction,
  changeInquiryStatusAction,
  restoreInquiryFromTrashAction,
  trashInquiryAction,
  unarchiveInquiryAction,
} from "@/features/inquiries/actions";
import { CopyEmailButton } from "@/features/inquiries/components/copy-email-button";
import { InquiryNoteForm } from "@/features/inquiries/components/inquiry-note-form";
import { InquiryRecordActions } from "@/features/inquiries/components/inquiry-record-actions";
import { InquiryRecordStateBadge } from "@/features/inquiries/components/inquiry-record-state-badge";
import { InquiryExportPopover } from "@/features/inquiries/components/inquiry-export-popover";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { InquiryStatusForm } from "@/features/inquiries/components/inquiry-status-form";
import { getInquiryDetailForBusiness } from "@/features/inquiries/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import {
  formatFileSize,
  formatInquiryBudget,
  formatInquiryDate,
  formatInquiryDateTime,
} from "@/features/inquiries/utils";
import {
  inquirySources,
  type DashboardInquiryDetail,
  type InquiryNoteActionState,
  type InquiryWorkflowStatus,
} from "@/features/inquiries/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { businessesHubPath } from "@/features/businesses/routes";
import {
  getBusinessInquiryExportPath,
  getBusinessNewQuotePath,
  getBusinessInquiryPrintPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";
import type { Metadata } from "next";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Inquiry detail",
  description: "View and respond to a single inquiry for this business.",
});

const InquiryAiPanel = dynamic(
  () =>
    import("@/features/ai/components/inquiry-ai-panel").then(
      (module) => module.InquiryAiPanel,
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

type InquiryDetailPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default function InquiryDetailPage({
  params,
}: InquiryDetailPageProps) {
  return (
    <Suspense fallback={<DashboardDetailPageSkeleton variant="inquiry" />}>
      <InquiryDetailContent params={params} />
    </Suspense>
  );
}

async function InquiryDetailContent({
  params,
}: InquiryDetailPageProps) {
  const [session, resolvedParams] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    resolvedParams.slug,
  );

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  const parsedParams = inquiryRouteParamsSchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    notFound();
  }
  const businessSlug = businessContext.business.slug;
  // Follow-ups only need businessId + inquiryId — start alongside the detail fetch.
  const followUpsPromise = getFollowUpsForInquiry({
    businessId: businessContext.business.id,
    inquiryId: parsedParams.data.id,
  });
  const inquiry = await getInquiryDetailForBusiness({
    businessId: businessContext.business.id,
    inquiryId: parsedParams.data.id,
  });

  if (!inquiry) {
    notFound();
  }

  const noteAction = addInquiryNoteAction.bind(null, inquiry.id);
  const statusAction = changeInquiryStatusAction.bind(null, inquiry.id);
  const archiveAction = archiveInquiryAction.bind(null, inquiry.id);
  const unarchiveAction = unarchiveInquiryAction.bind(null, inquiry.id);
  const trashAction = trashInquiryAction.bind(null, inquiry.id);
  const restoreAction = restoreInquiryFromTrashAction.bind(null, inquiry.id);
  const createFollowUpAction = createInquiryFollowUpAction.bind(null, inquiry.id);
  const customFields = getCustomSubmittedFields(
    inquiry.submittedFieldSnapshot,
  );
  const canViewCustomerHistory = hasFeatureAccess(
    businessContext.business.plan,
    "customerHistory",
  );
  const canExportData = hasFeatureAccess(
    businessContext.business.plan,
    "exports",
  );
  // Customer history + follow-ups stream via Suspense — don't block page render.
  const customerHistoryPromise = canViewCustomerHistory
    ? getCustomerHistoryForBusiness({
        businessId: businessContext.business.id,
        customerEmail: inquiry.customerEmail,
        customerContactHandle: inquiry.customerContactHandle,
        excludeInquiryId: inquiry.id,
        excludeQuoteId: inquiry.relatedQuote?.id ?? null,
      })
    : Promise.resolve(null);

  const canGenerateQuote = inquiry.recordState !== "trash";
  const workflowStatus: InquiryWorkflowStatus =
    inquiry.status === "quoted" ||
    inquiry.status === "won" ||
    inquiry.status === "lost"
      ? inquiry.status
      : "waiting";
  const customerContactEmail = getCustomerContactEmail(inquiry);
  const showPreferredContact = shouldShowPreferredContactTile(inquiry);
  const preferredContactLabel = getContactMethodLabel(
    inquiry.customerContactMethod,
  );
  const inquiryNextAction = getInquiryNextAction({
    businessSlug,
    inquiry,
  });

  return (
    <DashboardPage className="pb-24">
      <DashboardDetailHeader
        eyebrow="Inquiry detail"
        title={inquiry.customerName}
        description={getInquiryHeaderDescription(inquiry)}
        meta={
          <>
            <InquiryStatusBadge status={inquiry.status} />
            {inquiry.recordState !== "active" ? (
              <InquiryRecordStateBadge state={inquiry.recordState} />
            ) : null}
            <DashboardMetaPill>
              Received {formatInquiryDateTime(inquiry.submittedAt)}
            </DashboardMetaPill>
            <DashboardMetaPill
              className="max-w-full break-all font-mono text-[0.72rem]"
            >
              Ref {inquiry.id}
            </DashboardMetaPill>
          </>
        }
        actions={
          <div className="grid w-full gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
            <InquiryExportPopover
              canExport={canExportData}
              pdfHref={getBusinessInquiryExportPath(
                businessSlug,
                inquiry.id,
                "pdf",
              )}
              pngHref={getBusinessInquiryExportPath(
                businessSlug,
                inquiry.id,
                "png",
              )}
            />
            {canExportData ? (
              <Button asChild variant="outline">
                <Link
                  href={getBusinessInquiryPrintPath(businessSlug, inquiry.id)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Printer data-icon="inline-start" />
                  Print
                </Link>
              </Button>
            ) : (
              <ProFeatureNoticeButton
                noticeDescription="Upgrade to Pro to print inquiry records."
                noticeTitle="Print is a Pro feature."
                variant="outline"
              >
                <Printer data-icon="inline-start" />
                Print
              </ProFeatureNoticeButton>
            )}
            {canGenerateQuote ? (
              <Button asChild>
                <Link href={getBusinessNewQuotePath(businessSlug, inquiry.id)}>
                  <ReceiptText data-icon="inline-start" />
                  Generate quote
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <WorkflowNextActionCallout action={inquiryNextAction} />

      <DashboardDetailLayout className="xl:grid-cols-[1.45fr_0.95fr]">
        <DashboardSidebarStack>
          <DashboardSection
            contentClassName="flex flex-col gap-6"
            description={`${getInquirySourceDescription(inquiry.source)} Review the request before replying or quoting.`}
            title="Inquiry brief"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoTile label="Form" value={inquiry.inquiryFormName} />
              <InfoTile
                label={systemFieldDefaultLabels.budgetText}
                value={formatInquiryBudget(inquiry.budgetText)}
              />
              <InfoTile
                label={systemFieldDefaultLabels.requestedDeadline}
                value={inquiry.requestedDeadline ?? "Not provided"}
              />
              {inquiry.subject &&
              inquiry.subject !== inquiry.serviceCategory ? (
                <InfoTile
                  className="sm:col-span-3"
                  label="Subject"
                  value={inquiry.subject}
                />
              ) : null}
            </div>

            <div className="soft-panel px-5 py-5 shadow-none">
              <p className="meta-label">
                {systemFieldDefaultLabels.serviceCategory}
              </p>
              <TruncatedTextWithTooltip
                className="mt-3 text-sm leading-normal sm:leading-7 text-foreground"
                lines={3}
                text={inquiry.serviceCategory}
              />
            </div>

            <div className="soft-panel px-5 py-5 shadow-none">
              <p className="meta-label">
                {systemFieldDefaultLabels.details}
              </p>
              <TruncatedTextWithTooltip
                className="mt-3 whitespace-pre-wrap text-sm leading-normal sm:leading-7 text-foreground"
                lines={6}
                text={inquiry.details}
              />
            </div>

            {customFields.length ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="w-full sm:w-fit" type="button" variant="outline">
                    View additional details
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="w-full data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl data-[side=right]:xl:max-w-4xl"
                  motionPreset="sidebar"
                >
                  <SheetHeader>
                    <SheetTitle>Additional details</SheetTitle>
                    <SheetDescription>
                      Custom fields submitted with this inquiry.
                    </SheetDescription>
                  </SheetHeader>
                  <SheetBody className="min-h-0 flex-1">
                    <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                      <div className="grid gap-3 xl:grid-cols-2">
                        {customFields.map((field) => (
                          <InfoTile
                            key={field.id}
                            label={<span className="break-words">{field.label}</span>}
                            value={field.displayValue}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </SheetBody>
                </SheetContent>
              </Sheet>
            ) : null}
          </DashboardSection>

          {inquiry.attachments.length ? (
            <DashboardSection
              contentClassName="flex flex-col gap-4"
              description="Files included with the inquiry."
              title="Attachments"
            >
              <div className="soft-panel px-4 py-4 shadow-none">
                <p className="text-sm font-medium text-foreground">
                  {inquiry.attachments.length} file
                  {inquiry.attachments.length === 1 ? "" : "s"} attached
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Open the attachment list when you need the customer files.
                </p>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="w-full sm:w-fit" type="button" variant="outline">
                    <FileText data-icon="inline-start" />
                    View attachments
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-xl">
                  <SheetHeader>
                    <SheetTitle>Attachments</SheetTitle>
                    <SheetDescription>
                      Files included with this inquiry.
                    </SheetDescription>
                  </SheetHeader>
                  <SheetBody className="min-h-0 flex-1">
                    <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                      <DashboardDetailFeed>
                        {inquiry.attachments.map((attachment) => (
                          <DashboardDetailFeedItem
                            key={attachment.id}
                            action={
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={`/api/inquiries/${inquiry.id}/attachments/${attachment.id}`}
                                >
                                  Download
                                </a>
                              </Button>
                            }
                            meta={
                              <>
                                <span>{formatFileSize(attachment.fileSize)}</span>
                                <span aria-hidden="true">|</span>
                                <TruncatedTextWithTooltip
                                  className="max-w-44"
                                  text={attachment.contentType}
                                />
                                <span aria-hidden="true">|</span>
                                <span>
                                  {formatInquiryDateTime(attachment.createdAt)}
                                </span>
                              </>
                            }
                            title={attachment.fileName}
                          />
                        ))}
                      </DashboardDetailFeed>
                    </ScrollArea>
                  </SheetBody>
                </SheetContent>
              </Sheet>
            </DashboardSection>
          ) : null}

          <div className="dashboard-detail-support-grid">
            <InquiryNotesSheetSection
              inquiry={inquiry}
              noteAction={noteAction}
            />

            <Suspense fallback={<CustomerHistoryFallback locked={!canViewCustomerHistory} />}>
              <StreamedCustomerHistory
                businessSlug={businessSlug}
                historyPromise={customerHistoryPromise}
                locked={!canViewCustomerHistory}
              />
            </Suspense>

            <DashboardSection
              description="Submission and owner actions."
              title="Activity log"
            >
              {inquiry.activities.length ? (
                <div className="flex flex-col gap-3">
                  <DashboardDetailFeed>
                    {inquiry.activities.slice(0, 1).map((activity) => (
                      <DashboardDetailFeedItem
                        key={activity.id}
                        meta={
                          <>
                            <span>{activity.actorName ?? "Requo"}</span>
                            <span aria-hidden="true">|</span>
                            <span>{formatInquiryDateTime(activity.createdAt)}</span>
                          </>
                        }
                        title={activity.summary}
                      />
                    ))}
                  </DashboardDetailFeed>

                  {inquiry.activities.length > 1 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button className="w-full" type="button" variant="outline">
                          View all activity
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-md">
                        <SheetHeader>
                          <SheetTitle>Activity log</SheetTitle>
                          <SheetDescription>
                            Complete timeline of events for this inquiry.
                          </SheetDescription>
                        </SheetHeader>
                        <SheetBody className="min-h-0 flex-1 gap-5">
                          <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
                            <DashboardDetailFeed>
                              {inquiry.activities.map((activity) => (
                                <DashboardDetailFeedItem
                                  key={activity.id}
                                  meta={
                                    <>
                                      <span>{activity.actorName ?? "Requo"}</span>
                                      <span aria-hidden="true">|</span>
                                      <span>{formatInquiryDateTime(activity.createdAt)}</span>
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
                  )}
                </div>
              ) : (
                <DashboardEmptyState
                  description="Change the status or generate a quote to start the timeline for this inquiry."
                  title="No activity yet"
                  variant="section"
                />
              )}
            </DashboardSection>
          </div>
        </DashboardSidebarStack>

        <DashboardSidebarStack>
          <DashboardSection
            contentClassName="grid gap-3 sm:grid-cols-2"
            footer={
              customerContactEmail ? (
                <>
                  <Button asChild variant="outline">
                    <a href={`mailto:${customerContactEmail}`}>Email customer</a>
                  </Button>
                  <CopyEmailButton email={customerContactEmail} />
                </>
              ) : null
            }
            title="Customer contact"
          >
            <InfoTile
              className={showPreferredContact ? undefined : "sm:col-span-2"}
              icon={Mail}
              label="Email"
              valueClassName="break-all"
              value={
                customerContactEmail ? (
                  <TruncatedTextWithTooltip
                    className="underline-offset-4 hover:underline"
                    href={`mailto:${customerContactEmail}`}
                    text={customerContactEmail}
                  />
                ) : (
                  "Not provided"
                )
              }
            />

            {showPreferredContact ? (
              <InfoTile
                icon={AtSign}
                label={preferredContactLabel}
                value={inquiry.customerContactHandle}
                valueClassName="break-all"
              />
            ) : null}
          </DashboardSection>

          <div id="follow-ups">
            <Suspense fallback={<FollowUpPanelFallback />}>
              <StreamedFollowUpPanel
                businessSlug={businessSlug}
                createAction={createFollowUpAction}
                ctaDescription="Set a reminder for the next customer touchpoint on this inquiry."
                defaultChannel={inquiry.customerContactMethod}
                defaultReason="Follow up with the customer to keep this inquiry moving."
                defaultTitle={`Follow up with ${inquiry.customerName}`}
                followUpsPromise={followUpsPromise}
              />
            </Suspense>
          </div>

          <DashboardSection
            contentClassName="flex flex-col gap-4"
            description="Open the linked quote or create one."
            footer={
              <>
                {inquiry.relatedQuote ? (
                  <Button asChild variant="outline">
                    <Link
                      href={getBusinessQuotePath(
                        businessSlug,
                        inquiry.relatedQuote.id,
                      )}
                    >
                      View quote
                    </Link>
                  </Button>
                ) : null}
                {!inquiry.relatedQuote && canGenerateQuote ? (
                  <Button asChild>
                    <Link
                      href={getBusinessNewQuotePath(businessSlug, inquiry.id)}
                    >
                      <ReceiptText data-icon="inline-start" />
                      Generate quote
                    </Link>
                  </Button>
                ) : null}
              </>
            }
            title="Related quote"
          >
            {inquiry.relatedQuote ? (
              <div className="flex flex-col gap-4">
                <div className="dashboard-detail-header-meta">
                  <DashboardMetaPill className="text-foreground">
                    {inquiry.relatedQuote.quoteNumber ?? inquiry.relatedQuote.id}
                  </DashboardMetaPill>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile
                    label="Total"
                    value={formatQuoteMoney(
                      inquiry.relatedQuote.totalInCents,
                      businessContext.business.defaultCurrency,
                    )}
                  />
                  <InfoTile
                    label="Created"
                    value={formatInquiryDate(inquiry.relatedQuote.createdAt)}
                  />
                  <InfoTile
                    label="Quotes from inquiry"
                    value={`${inquiry.relatedQuote.quoteCount}`}
                  />
                  <InfoTile
                    label="Status"
                    value={inquiry.relatedQuote.status.charAt(0).toUpperCase() + inquiry.relatedQuote.status.slice(1)}
                  />
                </div>
              </div>
            ) : (
              <DashboardEmptyState
                description="Create a quote from this inquiry."
                icon={ReceiptText}
                title="No related quote yet"
                variant="section"
              />
            )}
          </DashboardSection>



          <DashboardSection
            description="Move the inquiry through your workflow."
            title="Workflow"
          >
            {inquiry.recordState === "active" ? (
              <InquiryStatusForm
                key={workflowStatus}
                action={statusAction}
                currentStatus={workflowStatus}
              />
            ) : (
              <Alert>
                <AlertTitle>
                  {inquiry.recordState === "archived"
                    ? "Restore this inquiry to active first."
                    : "Restore this inquiry from trash first."}
                </AlertTitle>
                <AlertDescription>
                  Workflow status is locked while the inquiry is{" "}
                  {inquiry.recordState === "archived" ? "archived" : "in trash"}.
                </AlertDescription>
              </Alert>
            )}
          </DashboardSection>

          <DashboardSection
            description="Archive for safekeeping or move obvious junk to trash."
            title="Manage inquiry"
          >
            <InquiryRecordActions
              archiveAction={archiveAction}
              recordState={inquiry.recordState}
              restoreAction={restoreAction}
              trashAction={trashAction}
              unarchiveAction={unarchiveAction}
            />
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
      <InquiryAiPanel
        businessSlug={businessSlug}
        inquiryId={inquiry.id}
        userName={session.user.name || "You"}
        plan={businessContext.business.plan}
      />
    </DashboardPage>
  );
}

function InquiryNotesSheetSection({
  inquiry,
  noteAction,
}: {
  inquiry: DashboardInquiryDetail;
  noteAction: (
    state: InquiryNoteActionState,
    formData: FormData,
  ) => Promise<InquiryNoteActionState>;
}) {
  const latestNote = inquiry.notes[0];

  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Private business notes and follow-up context."
      title="Internal notes"
    >
      {latestNote ? (
        <DashboardDetailFeed>
          <DashboardDetailFeedItem
            meta={formatInquiryDateTime(latestNote.createdAt)}
            title={latestNote.authorName ?? "Business owner"}
          >
            <TruncatedTextWithTooltip
              className="whitespace-pre-wrap"
              lines={6}
              text={latestNote.body}
            />
          </DashboardDetailFeedItem>
        </DashboardDetailFeed>
      ) : (
        <DashboardEmptyState
          description="Add notes only when you need private context for follow-up."
          title="No internal notes yet"
          variant="section"
        />
      )}

      <Sheet>
        <SheetTrigger asChild>
          <Button className="w-full" type="button" variant="outline">
            Add or view notes
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Internal notes</SheetTitle>
            <SheetDescription>
              Add private context and review all notes for this inquiry.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="min-h-0 flex-1 gap-5">
            <InquiryNoteForm action={noteAction} embedded />
            {inquiry.notes.length ? (
              <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                <DashboardDetailFeed>
                  {inquiry.notes.map((note) => (
                    <DashboardDetailFeedItem
                      key={note.id}
                      meta={formatInquiryDateTime(note.createdAt)}
                      title={note.authorName ?? "Business owner"}
                    >
                      <TruncatedTextWithTooltip
                        className="whitespace-pre-wrap"
                        lines={6}
                        text={note.body}
                      />
                    </DashboardDetailFeedItem>
                  ))}
                </DashboardDetailFeed>
              </ScrollArea>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </DashboardSection>
  );
}

function CustomerHistorySheetSection({
  businessSlug,
  history,
  locked = false,
}: Parameters<typeof CustomerHistoryPanel>[0] & { locked?: boolean }) {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Past records for this customer email inside the current business."
      title="Customer history"
    >
      {locked ? (
        <DashboardEmptyState
          description="Upgrade to Pro to review prior inquiries and quotes for this customer."
          title="Customer history is a Pro feature"
          variant="section"
        />
      ) : history ? (
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

function getInquiryHeaderDescription(inquiry: {
  serviceCategory: string;
  source: string | null;
  submittedAt: Date;
}) {
  const eventLabel =
    inquiry.source === inquirySources.manualDashboard
      ? "inquiry created"
      : "inquiry received";

  return `${inquiry.serviceCategory} ${eventLabel} ${formatInquiryDateTime(
    inquiry.submittedAt,
  )}.`;
}

function getInquirySourceDescription(source: string | null) {
  if (source === inquirySources.manualDashboard) {
    return "Created manually inside the dashboard.";
  }

  return "Submitted through the public form.";
}

function getCustomerContactEmail(inquiry: {
  customerEmail: string | null;
  customerContactMethod: string | null;
  customerContactHandle: string | null;
}) {
  if (inquiry.customerEmail) return inquiry.customerEmail;
  if (
    inquiry.customerContactMethod === "email" &&
    inquiry.customerContactHandle
  ) {
    return inquiry.customerContactHandle;
  }
  return null;
}

function shouldShowPreferredContactTile(inquiry: {
  customerEmail: string | null;
  customerContactMethod: string | null;
  customerContactHandle: string | null;
}) {
  if (!inquiry.customerContactHandle || !inquiry.customerContactMethod) {
    return false;
  }
  if (inquiry.customerContactMethod === "email") {
    return inquiry.customerContactHandle !== inquiry.customerEmail;
  }
  return true;
}

function getContactMethodLabel(method: string | null) {
  if (!method) return "Contact";
  return (
    inquiryContactMethodLabels[method as InquiryContactMethod] ?? "Contact"
  );
}

/* -------------------------------------------------------------------------- */
/*  Streamed sections — async components wrapped in Suspense above            */
/* -------------------------------------------------------------------------- */

async function StreamedFollowUpPanel({
  followUpsPromise,
  ...props
}: Omit<React.ComponentProps<typeof FollowUpPanel>, "followUps"> & {
  followUpsPromise: Promise<Awaited<ReturnType<typeof getFollowUpsForInquiry>>>;
}) {
  const followUps = await followUpsPromise;

  return <FollowUpPanel {...props} followUps={followUps} />;
}

async function StreamedCustomerHistory({
  businessSlug,
  historyPromise,
  locked,
}: {
  businessSlug: string;
  historyPromise: Promise<Awaited<ReturnType<typeof getCustomerHistoryForBusiness>> | null>;
  locked: boolean;
}) {
  const history = await historyPromise;

  return (
    <CustomerHistorySheetSection
      businessSlug={businessSlug}
      history={history}
      locked={locked}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */

function FollowUpPanelFallback() {
  return (
    <DashboardSection
      description="Loading follow-up reminders..."
      title="Follow-ups"
    >
      <div className="flex flex-col gap-3">
        <div className="soft-panel animate-pulse px-4 py-4 shadow-none">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="mt-2 h-3 w-64 rounded bg-muted" />
        </div>
      </div>
    </DashboardSection>
  );
}

function CustomerHistoryFallback({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <DashboardSection
        contentClassName="flex flex-col gap-4"
        description="Past records for this customer email inside the current business."
        title="Customer history"
      >
        <DashboardEmptyState
          description="Upgrade to Pro to review prior inquiries and quotes for this customer."
          title="Customer history is a Pro feature"
          variant="section"
        />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Past records for this customer email inside the current business."
      title="Customer history"
    >
      <div className="grid animate-pulse gap-3 sm:grid-cols-2">
        <div className="soft-panel px-4 py-4 shadow-none">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-2 h-5 w-8 rounded bg-muted" />
        </div>
        <div className="soft-panel px-4 py-4 shadow-none">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-2 h-5 w-8 rounded bg-muted" />
        </div>
      </div>
    </DashboardSection>
  );
}
