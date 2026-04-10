import Link from "next/link";
import {
  Building2,
  Download,
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
import { InfoTile } from "@/components/shared/info-tile";
import { InquiryAiPanel } from "@/features/ai/components/inquiry-ai-panel";
import { CustomerHistoryPanel } from "@/features/customers/components/customer-history-panel";
import { getCustomerHistoryForBusiness } from "@/features/customers/queries";
import { getAdditionalInquirySubmittedFields } from "@/features/inquiries/form-config";
import {
  addInquiryNoteAction,
  changeInquiryStatusAction,
} from "@/features/inquiries/actions";
import { CopyEmailButton } from "@/features/inquiries/components/copy-email-button";
import { InquiryNoteForm } from "@/features/inquiries/components/inquiry-note-form";
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
import { formatQuoteMoney } from "@/features/quotes/utils";
import {
  businessesHubPath,
  getBusinessNewQuotePath,
  getBusinessInquiryPdfExportPath,
  getBusinessInquiryPrintPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

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
    redirect(businessesHubPath);
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
  const additionalFields = getAdditionalInquirySubmittedFields(
    inquiry.submittedFieldSnapshot,
  );
  const customerHistory = await getCustomerHistoryForBusiness({
    businessId: businessContext.business.id,
    customerEmail: inquiry.customerEmail,
    excludeInquiryId: inquiry.id,
  });

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
          <div className="dashboard-actions">
            <Button asChild variant="outline">
              <a href={getBusinessInquiryPdfExportPath(businessSlug, inquiry.id)}>
                <Download data-icon="inline-start" />
                Export PDF
              </a>
            </Button>
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
            <Button asChild>
              <Link href={getBusinessNewQuotePath(businessSlug, inquiry.id)}>
                <ReceiptText data-icon="inline-start" />
                Generate quote
              </Link>
            </Button>
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
                          <span>{activity.actorName ?? "Requo"}</span>
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
                <Button asChild>
                  <Link
                    href={getBusinessNewQuotePath(businessSlug, inquiry.id)}
                  >
                  <ReceiptText data-icon="inline-start" />
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
        </DashboardSidebarStack>
      </DashboardDetailLayout>
      <InquiryAiPanel inquiryId={inquiry.id} userName={session.user.name || "You"} />
    </DashboardPage>
  );
}
