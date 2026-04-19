import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Building2,
  FileText,
  Mail,
  Phone,
  Printer,
  ReceiptText,
} from "lucide-react";
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
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
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
import { AddToCalendarButton } from "@/features/calendar/components/add-to-calendar-button";
import { CalendarEventSummary } from "@/features/calendar/components/calendar-event-summary";
import { prefillFromInquiry } from "@/features/calendar/prefill";
import { getCalendarConnectionForUser, getCalendarEventsForInquiry } from "@/features/calendar/queries";
import { CustomerHistoryPanel } from "@/features/customers/components/customer-history-panel";
import { getCustomerHistoryForBusiness } from "@/features/customers/queries";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
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
import type { InquiryWorkflowStatus } from "@/features/inquiries/types";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { workspacesHubPath } from "@/features/workspaces/routes";
import {
  getBusinessInquiryExportPath,
  getBusinessNewQuotePath,
  getBusinessInquiryPrintPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { Button } from "@/components/ui/button";
import { isGoogleCalendarConfigured } from "@/lib/env";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

const InquiryAiPanel = dynamic(
  () =>
    import("@/features/ai/components/inquiry-ai-panel").then(
      (module) => module.InquiryAiPanel,
    ),
  {
    loading: () => (
      <div className="section-panel mt-6 px-5 py-5 sm:px-6">
        <p className="meta-label">AI assistant</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Loading assistant tools...
        </p>
      </div>
    ),
  },
);

type InquiryDetailPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function InquiryDetailPage({
  params,
}: InquiryDetailPageProps) {
  const [session, resolvedParams] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    resolvedParams.slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  const parsedParams = inquiryRouteParamsSchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    notFound();
  }
  const businessSlug = businessContext.business.slug;
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
  const additionalFields = getAdditionalInquirySubmittedFields(
    inquiry.submittedFieldSnapshot,
  );
  const [customerHistory, calendarConnection, calendarEvents] = await Promise.all([
    getCustomerHistoryForBusiness({
      businessId: businessContext.business.id,
      customerEmail: inquiry.customerEmail,
      excludeInquiryId: inquiry.id,
      excludeQuoteId: inquiry.relatedQuote?.id ?? null,
    }),
    isGoogleCalendarConfigured
      ? getCalendarConnectionForUser(session.user.id)
      : Promise.resolve({ connected: false, googleEmail: null, selectedCalendarId: null }),
    isGoogleCalendarConfigured
      ? getCalendarEventsForInquiry(businessContext.business.id, inquiry.id)
      : Promise.resolve([]),
  ]);

  const calendarPrefill = isGoogleCalendarConfigured
    ? prefillFromInquiry(
        {
          customerName: inquiry.customerName,
          customerEmail: inquiry.customerEmail,
          serviceCategory: inquiry.serviceCategory,
          subject: inquiry.subject,
          details: inquiry.details,
        },
        {
          name: businessContext.business.name,
          contactEmail: null,
        },
      )
    : null;
  const canGenerateQuote = inquiry.recordState !== "trash";
  const workflowStatus: InquiryWorkflowStatus =
    inquiry.status === "quoted" ||
    inquiry.status === "won" ||
    inquiry.status === "lost"
      ? inquiry.status
      : "waiting";

  return (
    <DashboardPage className="pb-24">
      <DashboardDetailHeader
        eyebrow="Inquiry detail"
        title={inquiry.customerName}
        description={`${inquiry.serviceCategory} inquiry received ${formatInquiryDate(
          inquiry.submittedAt,
        )}.`}
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
          <div className="flex flex-nowrap items-center gap-2.5">
            {isGoogleCalendarConfigured && calendarPrefill ? (
              <AddToCalendarButton
                businessId={businessContext.business.id}
                connected={calendarConnection.connected}
                inquiryId={inquiry.id}
                prefill={calendarPrefill}
              />
            ) : null}
            <InquiryExportPopover
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
            <Button asChild variant="outline">
              <Link
                href={getBusinessInquiryPrintPath(businessSlug, inquiry.id)}
                prefetch={false}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Printer data-icon="inline-start" />
                Print
              </Link>
            </Button>
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

      <DashboardDetailLayout className="xl:grid-cols-[1.45fr_0.95fr]">
        <DashboardSidebarStack>
          <DashboardSection
            contentClassName="flex flex-col gap-6"
            description="Submitted through the public form."
            title="Summary"
          >
            <DashboardStatsGrid className="xl:grid-cols-4">
              <InfoTile label="Category" value={inquiry.serviceCategory} />
              <InfoTile label="Form" value={inquiry.inquiryFormName} />
              <InfoTile
                label="Budget"
                value={formatInquiryBudget(inquiry.budgetText)}
              />
              <InfoTile
                label="Deadline"
                value={inquiry.requestedDeadline ?? "Not provided"}
              />
              {inquiry.subject ? (
                <InfoTile
                  className="md:col-span-2 xl:col-span-4"
                  label="Subject"
                  value={inquiry.subject}
                />
              ) : null}
            </DashboardStatsGrid>

            <div className="soft-panel px-5 py-5 shadow-none">
              <p className="meta-label">Message</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                {inquiry.details}
              </p>
            </div>

            {additionalFields.length ? (
              <div className="soft-panel px-5 py-5 shadow-none">
                <p className="meta-label">Submitted fields</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {additionalFields.map((field) => (
                    <InfoTile
                      key={field.id}
                      label={field.label}
                      value={field.displayValue}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </DashboardSection>

          <DashboardSection
            description="Files included with the inquiry."
            title="Attachments"
          >
            {inquiry.attachments.length ? (
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
                        <span>{attachment.contentType}</span>
                        <span aria-hidden="true">|</span>
                        <span>{formatInquiryDateTime(attachment.createdAt)}</span>
                      </>
                    }
                    title={attachment.fileName}
                  />
                ))}
              </DashboardDetailFeed>
            ) : (
              <DashboardEmptyState
                description="Ask the customer to send reference files if more context is needed for pricing or scope."
                icon={FileText}
                title="No attachments"
                variant="section"
              />
            )}
          </DashboardSection>

          <div className="dashboard-detail-support-grid">
            <DashboardSection
              contentClassName="flex flex-col gap-5"
              description="Private business notes and follow-up context."
              title="Internal notes"
            >
              <InquiryNoteForm action={noteAction} embedded />
              {inquiry.notes.length ? (
                <div className="flex flex-col gap-3">
                  <DashboardDetailFeed>
                    {inquiry.notes.slice(0, 1).map((note) => (
                      <DashboardDetailFeedItem
                        key={note.id}
                        meta={formatInquiryDateTime(note.createdAt)}
                        title={note.authorName ?? "Business owner"}
                      >
                        <p className="whitespace-pre-wrap">{note.body}</p>
                      </DashboardDetailFeedItem>
                    ))}
                  </DashboardDetailFeed>

                  {inquiry.notes.length > 1 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button className="w-full" type="button" variant="outline">
                          View all notes
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-md">
                        <SheetHeader>
                          <SheetTitle>Internal notes</SheetTitle>
                          <SheetDescription>
                            All private notes for this inquiry.
                          </SheetDescription>
                        </SheetHeader>
                        <SheetBody className="min-h-0 flex-1 gap-5">
                          <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
                            <DashboardDetailFeed>
                              {inquiry.notes.map((note) => (
                                <DashboardDetailFeedItem
                                  key={note.id}
                                  meta={formatInquiryDateTime(note.createdAt)}
                                  title={note.authorName ?? "Business owner"}
                                >
                                  <p className="whitespace-pre-wrap">{note.body}</p>
                                </DashboardDetailFeedItem>
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
                  description="Use the note form above to capture follow-up context, decisions, or customer details."
                  title="No internal notes yet"
                  variant="section"
                />
              )}
            </DashboardSection>

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
            contentClassName="flex flex-col gap-4"
            description="Reach out directly from the business."
            footer={
              <>
                <Button asChild variant="outline">
                  <a href={`mailto:${inquiry.customerEmail}`}>Email customer</a>
                </Button>
                <CopyEmailButton email={inquiry.customerEmail} />
              </>
            }
            title="Customer contact"
          >
              <InfoTile
                icon={Mail}
                label="Email"
                value={
                  <a
                    className="truncate underline-offset-4 hover:underline"
                    href={`mailto:${inquiry.customerEmail}`}
                  >
                    {inquiry.customerEmail}
                  </a>
                }
              />

              <InfoTile
                icon={Phone}
                label="Phone"
                value={
                  inquiry.customerPhone ? (
                    <a
                      className="underline-offset-4 hover:underline"
                      href={`tel:${inquiry.customerPhone}`}
                    >
                      {inquiry.customerPhone}
                    </a>
                  ) : (
                    "Not provided"
                  )
                }
              />
              {inquiry.companyName ? (
                <InfoTile
                  icon={Building2}
                  label="Company"
                  value={inquiry.companyName}
                />
              ) : null}
          </DashboardSection>

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
                <div className="!grid !grid-cols-2 gap-3">
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

          <CustomerHistoryPanel
            history={customerHistory}
            businessSlug={businessSlug}
          />

          {isGoogleCalendarConfigured ? (
            <CalendarEventSummary events={calendarEvents} />
          ) : null}

          <DashboardSection
            description="Move the request through your workflow."
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
                    ? "Restore this request to active first."
                    : "Restore this request from trash first."}
                </AlertTitle>
                <AlertDescription>
                  Workflow status is locked while the request is{" "}
                  {inquiry.recordState === "archived" ? "archived" : "in trash"}.
                </AlertDescription>
              </Alert>
            )}
          </DashboardSection>

          <DashboardSection
            description="Archive for safekeeping or move obvious junk to trash."
            title="Manage request"
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
      <InquiryAiPanel inquiryId={inquiry.id} userName={session.user.name || "You"} />
    </DashboardPage>
  );
}
