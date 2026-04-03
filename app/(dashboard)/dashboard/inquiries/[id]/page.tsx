import Link from "next/link";
import { FileText, Mail, Phone, ReceiptText } from "lucide-react";
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
  DashboardStatsGrid,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { generateInquiryAssistantAction } from "@/features/ai/actions";
import { InquiryAiPanel } from "@/features/ai/components/inquiry-ai-panel";
import {
  addInquiryNoteAction,
  changeInquiryStatusAction,
} from "@/features/inquiries/actions";
import { CopyEmailButton } from "@/features/inquiries/components/copy-email-button";
import { InquiryNoteForm } from "@/features/inquiries/components/inquiry-note-form";
import { InquiryStatusBadge } from "@/features/inquiries/components/inquiry-status-badge";
import { InquiryStatusForm } from "@/features/inquiries/components/inquiry-status-form";
import { getInquiryDetailForWorkspace } from "@/features/inquiries/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import {
  formatFileSize,
  formatInquiryBudget,
  formatInquiryDate,
  formatInquiryDateTime,
} from "@/features/inquiries/utils";
import { formatQuoteMoney } from "@/features/quotes/utils";
import { Button } from "@/components/ui/button";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type InquiryDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InquiryDetailPage({
  params,
}: InquiryDetailPageProps) {
  const parsedParams = inquiryRouteParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const inquiry = await getInquiryDetailForWorkspace({
    workspaceId: workspaceContext.workspace.id,
    inquiryId: parsedParams.data.id,
  });

  if (!inquiry) {
    notFound();
  }

  const noteAction = addInquiryNoteAction.bind(null, inquiry.id);
  const statusAction = changeInquiryStatusAction.bind(null, inquiry.id);
  const aiAction = generateInquiryAssistantAction.bind(null, inquiry.id);

  return (
    <DashboardPage>
      <DashboardDetailHeader
        eyebrow="Inquiry detail"
        title={inquiry.customerName}
        description={`${inquiry.serviceCategory} inquiry received ${formatInquiryDate(
          inquiry.submittedAt,
        )}.`}
        meta={
          <>
            <InquiryStatusBadge status={inquiry.status} />
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
          <Button asChild>
            <Link
              href={`/dashboard/quotes/new?inquiryId=${inquiry.id}`}
              prefetch={false}
            >
              <ReceiptText data-icon="inline-start" />
              Generate quote
            </Link>
          </Button>
        }
      />

      <DashboardDetailLayout className="xl:grid-cols-[1.45fr_0.95fr]">
        <DashboardSidebarStack>
          <DashboardSection
            contentClassName="flex flex-col gap-6"
            description="Submitted through the public form."
            title="Overview"
          >
            <DashboardStatsGrid className="xl:grid-cols-4">
              <InfoTile label="Category" value={inquiry.serviceCategory} />
              <InfoTile
                label="Budget"
                value={formatInquiryBudget(inquiry.budgetText)}
              />
              <InfoTile
                label="Deadline"
                value={inquiry.requestedDeadline ?? "Not provided"}
              />
              <InfoTile
                label="Source"
                value={
                  inquiry.source ? inquiry.source.replace(/[-_]/g, " ") : "Unknown"
                }
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
              description="Private workspace notes and follow-up context."
              title="Internal notes"
            >
              <InquiryNoteForm action={noteAction} embedded />
              {inquiry.notes.length ? (
                <DashboardDetailFeed>
                  {inquiry.notes.map((note) => (
                    <DashboardDetailFeedItem
                      key={note.id}
                      meta={formatInquiryDateTime(note.createdAt)}
                      title={note.authorName ?? "Workspace owner"}
                    >
                      <p className="whitespace-pre-wrap">{note.body}</p>
                    </DashboardDetailFeedItem>
                  ))}
                </DashboardDetailFeed>
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
                <DashboardDetailFeed>
                  {inquiry.activities.map((activity) => (
                    <DashboardDetailFeedItem
                      key={activity.id}
                      meta={
                        <>
                          <span>{activity.actorName ?? "Relay"}</span>
                          <span aria-hidden="true">|</span>
                          <span>{formatInquiryDateTime(activity.createdAt)}</span>
                        </>
                      }
                      title={activity.summary}
                    />
                  ))}
                </DashboardDetailFeed>
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
            description="Reach out directly from the workspace."
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
          </DashboardSection>

          <DashboardSection
            contentClassName="flex flex-col gap-4"
            description="Open the linked quote or create one."
            footer={
              <>
                {inquiry.relatedQuote ? (
                  <Button asChild variant="outline">
                    <Link
                      href={`/dashboard/quotes/${inquiry.relatedQuote.id}`}
                      prefetch={false}
                    >
                      View quote
                    </Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href={`/dashboard/quotes/new?inquiryId=${inquiry.id}`} prefetch={false}>
                    Generate quote
                  </Link>
                </Button>
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
                  <DashboardMetaPill className="capitalize">
                    {inquiry.relatedQuote.status}
                  </DashboardMetaPill>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile
                    label="Total"
                    value={formatQuoteMoney(
                      inquiry.relatedQuote.totalInCents,
                      workspaceContext.workspace.defaultCurrency,
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
            description="Move the inquiry forward."
            title="Status"
          >
              <InquiryStatusForm
                key={inquiry.status}
                action={statusAction}
                currentStatus={inquiry.status}
              />
          </DashboardSection>

          <InquiryAiPanel action={aiAction} />
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}
