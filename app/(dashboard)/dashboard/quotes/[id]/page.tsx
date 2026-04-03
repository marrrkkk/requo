import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { InfoTile } from "@/components/shared/info-tile";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  changeQuoteStatusAction,
  sendQuoteAction,
  updateQuoteAction,
} from "@/features/quotes/actions";
import { CopyQuoteLinkButton } from "@/features/quotes/components/copy-quote-link-button";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { QuoteSendForm } from "@/features/quotes/components/quote-send-form";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { QuoteStatusForm } from "@/features/quotes/components/quote-status-form";
import { getQuoteDetailForWorkspace } from "@/features/quotes/queries";
import { quoteRouteParamsSchema } from "@/features/quotes/schemas";
import {
  formatQuoteDate,
  formatQuoteDateTime,
  formatQuoteMoney,
  getPublicQuoteUrl,
  getQuoteEditorInitialValuesFromDetail,
} from "@/features/quotes/utils";
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
  EmptyTitle,
} from "@/components/ui/empty";
import { env } from "@/lib/env";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

type QuoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  const parsedParams = quoteRouteParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  const { workspaceContext } = await requireCurrentWorkspaceContext();
  const quote = await getQuoteDetailForWorkspace({
    workspaceId: workspaceContext.workspace.id,
    quoteId: parsedParams.data.id,
  });

  if (!quote) {
    notFound();
  }

  const updateAction = updateQuoteAction.bind(null, quote.id);
  const statusAction = changeQuoteStatusAction.bind(null, quote.id);
  const sendAction = sendQuoteAction.bind(null, quote.id);
  const customerQuotePath = getPublicQuoteUrl(quote.publicToken);
  const customerQuoteUrl = new URL(customerQuotePath, env.BETTER_AUTH_URL).toString();
  const linkedInquiry = quote.linkedInquiry
    ? {
        id: quote.linkedInquiry.id,
        customerName: quote.linkedInquiry.customerName,
        customerEmail: quote.linkedInquiry.customerEmail,
        serviceCategory: quote.linkedInquiry.serviceCategory,
        status: quote.linkedInquiry.status,
      }
    : null;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Quote detail"
        title={quote.quoteNumber}
        description={`${quote.title} for ${quote.customerName}.`}
        actions={
          <>
            <QuoteStatusBadge status={quote.status} />
            <span className="rounded-md border border-border/80 bg-background px-3 py-1 text-xs text-muted-foreground">
              Valid until {formatQuoteDate(quote.validUntil)}
            </span>
            {quote.inquiryId ? (
              <span className="rounded-md border border-border/80 bg-background px-3 py-1 text-xs text-muted-foreground">
                Linked inquiry
              </span>
            ) : null}
            <Button asChild variant="outline">
              <a href={`mailto:${quote.customerEmail}`}>
                <Mail data-icon="inline-start" />
                Email customer
              </a>
            </Button>
          </>
        }
      />

      {quote.status === "draft" ? (
        <QuoteEditor
          action={updateAction}
          workspaceName={workspaceContext.workspace.name}
          currency={quote.currency}
          initialValues={getQuoteEditorInitialValuesFromDetail(quote)}
          linkedInquiry={linkedInquiry}
          quoteNumber={quote.quoteNumber}
          submitLabel="Save draft quote"
          submitPendingLabel="Saving draft..."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <QuotePreview
            workspaceName={workspaceContext.workspace.name}
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

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Quote details</CardTitle>
              <CardDescription>Read-only until moved back to draft.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoTile label="Customer" value={quote.customerName} />
              <InfoTile label="Email" value={quote.customerEmail} />
              <InfoTile
                label="Subtotal"
                value={formatQuoteMoney(quote.subtotalInCents, quote.currency)}
              />
              <InfoTile
                label="Total"
                value={formatQuoteMoney(quote.totalInCents, quote.currency)}
              />
              <InfoTile
                label="Sent"
                value={quote.sentAt ? formatQuoteDateTime(quote.sentAt) : "Not sent"}
              />
              <InfoTile
                label="Accepted"
                value={
                  quote.acceptedAt
                    ? formatQuoteDateTime(quote.acceptedAt)
                    : "Not accepted"
                }
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Activity log</CardTitle>
              <CardDescription>Quote events and owner actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {quote.activities.length ? (
                <div className="flex flex-col gap-3">
                  {quote.activities.map((activity) => (
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
                          {formatQuoteDateTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>No quote activity yet</EmptyTitle>
                    <EmptyDescription>Quote events will appear here.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Linked inquiry</CardTitle>
              <CardDescription>Original inquiry context.</CardDescription>
            </CardHeader>
            <CardContent>
              {quote.linkedInquiry ? (
                <div className="soft-panel p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        Inquiry status {quote.linkedInquiry.status}
                      </span>
                      <span className="rounded-md border border-border/80 bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        Inquiry {quote.linkedInquiry.id}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoTile
                        label="Customer"
                        value={quote.linkedInquiry.customerName}
                      />
                      <InfoTile
                        label="Email"
                        value={quote.linkedInquiry.customerEmail}
                      />
                      <InfoTile
                        label="Category"
                        value={quote.linkedInquiry.serviceCategory}
                      />
                      <InfoTile
                        label="Inquiry status"
                        value={quote.linkedInquiry.status}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>No linked inquiry</EmptyTitle>
                    <EmptyDescription>This quote was created manually.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
            {quote.linkedInquiry ? (
              <CardFooter className="justify-end">
                <Button asChild variant="outline">
                  <Link
                    href={`/dashboard/inquiries/${quote.linkedInquiry.id}`}
                    prefetch={false}
                  >
                    Open inquiry
                  </Link>
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {quote.status !== "draft" ? (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle>Customer view</CardTitle>
                <CardDescription>Share and track the public quote.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="soft-panel p-4">
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
                {quote.customerResponseMessage ? (
                  <div className="soft-panel p-4">
                    <p className="meta-label">Customer message</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {quote.customerResponseMessage}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <CopyQuoteLinkButton url={customerQuoteUrl} />
                  <Button asChild variant="outline">
                    <Link href={customerQuotePath} prefetch={false} target="_blank">
                      Open customer view
                      <ExternalLink data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {quote.status === "draft" ? (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle>Send quote</CardTitle>
                <CardDescription>Email the finished draft.</CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteSendForm
                  action={sendAction}
                  customerEmail={quote.customerEmail}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-background/70">
              <CardHeader className="gap-2">
                <CardTitle>Delivery state</CardTitle>
                <CardDescription>Read-only after send.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="soft-panel p-4">
                  <p className="text-sm font-medium text-foreground">Current status</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {quote.status === "sent"
                      ? "This quote has already been delivered."
                      : `This quote is ${quote.status}.`}
                  </p>
                </div>
                {quote.sentAt ? (
                  <div className="soft-panel p-4 text-sm text-muted-foreground">
                    Sent on {formatQuoteDateTime(quote.sentAt)}.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Status</CardTitle>
              <CardDescription>Move the quote through its lifecycle.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuoteStatusForm
                key={quote.status}
                action={statusAction}
                currentStatus={quote.status}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2">
              <CardTitle>Quote summary</CardTitle>
              <CardDescription>Key commercial details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoTile label="Quote number" value={quote.quoteNumber} />
              <InfoTile label="Title" value={quote.title} />
              <InfoTile
                label="Valid until"
                value={formatQuoteDate(quote.validUntil)}
              />
              <InfoTile
                label="Total"
                value={formatQuoteMoney(quote.totalInCents, quote.currency)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
