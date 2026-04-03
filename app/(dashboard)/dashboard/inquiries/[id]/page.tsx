import Link from "next/link";
import { FileText, Mail, Phone, ReceiptText } from "lucide-react";
import { notFound } from "next/navigation";

import { InfoTile } from "@/components/shared/info-tile";
import { PageHeader } from "@/components/shared/page-header";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
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
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Inquiry detail"
        title={inquiry.customerName}
        description={`${inquiry.serviceCategory} submitted ${formatInquiryDate(
          inquiry.submittedAt,
        )}.`}
        actions={
          <>
            <InquiryStatusBadge status={inquiry.status} />
            <span className="rounded-md border border-border/80 bg-background px-3 py-1 text-xs text-muted-foreground">
              Ref {inquiry.id}
            </span>
            <Button asChild>
              <Link
                href={`/dashboard/quotes/new?inquiryId=${inquiry.id}`}
                prefetch={false}
              >
                <ReceiptText data-icon="inline-start" />
                Generate quote
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Inquiry details</CardTitle>
              <CardDescription>Submitted through the public form.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <h2 className="text-sm font-medium text-foreground">Message</h2>
                <div className="soft-panel bg-muted/25 px-5 py-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {inquiry.details}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Attachments</CardTitle>
              <CardDescription>Files included with the inquiry.</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiry.attachments.length ? (
                <div className="flex flex-col gap-3">
                  {inquiry.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="soft-panel flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex flex-col gap-1">
                        <p className="truncate font-medium text-foreground">
                          {attachment.fileName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(attachment.fileSize)} | {attachment.contentType}
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <a
                          href={`/api/inquiries/${inquiry.id}/attachments/${attachment.id}`}
                        >
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText />
                    </EmptyMedia>
                    <EmptyTitle>No attachments</EmptyTitle>
                    <EmptyDescription>This inquiry has no uploaded files.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Internal notes</CardTitle>
              <CardDescription>Private workspace notes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <InquiryNoteForm action={noteAction} />
              <Separator />
              {inquiry.notes.length ? (
                <div className="flex flex-col gap-3">
                  {inquiry.notes.map((note) => (
                    <div
                      key={note.id}
                      className="soft-panel p-4"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {note.authorName ?? "Workspace owner"}
                          </span>
                          <span>|</span>
                          <span>{formatInquiryDateTime(note.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {note.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>No internal notes yet</EmptyTitle>
                    <EmptyDescription>Add a note for follow-up context.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Activity log</CardTitle>
              <CardDescription>Submission and owner actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiry.activities.length ? (
                <div className="flex flex-col gap-3">
                  {inquiry.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="soft-panel p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.summary}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.actorName ?? "QuoteFlow"} |{" "}
                          {formatInquiryDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>No activity yet</EmptyTitle>
                    <EmptyDescription>Actions will appear here as work progresses.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Customer contact</CardTitle>
              <CardDescription>Email or call from here.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
              <Button asChild variant="outline">
                <a href={`mailto:${inquiry.customerEmail}`}>Email customer</a>
              </Button>
              <CopyEmailButton email={inquiry.customerEmail} />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Related quote</CardTitle>
              <CardDescription>Open the linked quote or create one.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {inquiry.relatedQuote ? (
                <div className="soft-panel p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs font-medium capitalize text-foreground">
                        {inquiry.relatedQuote.status}
                      </span>
                      <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        {inquiry.relatedQuote.quoteNumber ?? inquiry.relatedQuote.id}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoTile
                        label="Quote status"
                        value={inquiry.relatedQuote.status}
                      />
                      <InfoTile
                        label="Total"
                        value={`$${(inquiry.relatedQuote.totalInCents / 100).toFixed(2)}`}
                      />
                      <InfoTile
                        label="Created"
                        value={formatInquiryDate(inquiry.relatedQuote.createdAt)}
                      />
                      <InfoTile
                        label="Linked quotes"
                        value={`${inquiry.relatedQuote.quoteCount}`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ReceiptText />
                    </EmptyMedia>
                    <EmptyTitle>No related quote yet</EmptyTitle>
                    <EmptyDescription>Create a quote from this inquiry.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
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
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Status</CardTitle>
              <CardDescription>Move the inquiry forward.</CardDescription>
            </CardHeader>
            <CardContent>
              <InquiryStatusForm
                key={inquiry.status}
                action={statusAction}
                currentStatus={inquiry.status}
              />
            </CardContent>
          </Card>

          <InquiryAiPanel action={aiAction} />
        </div>
      </div>
    </div>
  );
}
