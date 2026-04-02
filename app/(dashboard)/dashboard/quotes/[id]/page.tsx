import Link from "next/link";
import { Mail } from "lucide-react";
import { notFound } from "next/navigation";

import {
  changeQuoteStatusAction,
  sendQuoteAction,
  updateQuoteAction,
} from "@/features/quotes/actions";
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
  getQuoteEditorInitialValuesFromDetail,
} from "@/features/quotes/utils";
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
  EmptyTitle,
} from "@/components/ui/empty";
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl flex flex-col gap-3">
          <span className="eyebrow">Quote detail</span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {quote.quoteNumber}
            </h1>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              {quote.title} for {quote.customerName}, created on{" "}
              {formatQuoteDate(quote.createdAt)}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QuoteStatusBadge status={quote.status} />
            <span className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
              Valid until {formatQuoteDate(quote.validUntil)}
            </span>
            {quote.inquiryId ? (
              <span className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
                Linked inquiry
              </span>
            ) : null}
          </div>
        </div>

        <Button asChild variant="outline">
          <a href={`mailto:${quote.customerEmail}`}>
            <Mail data-icon="inline-start" />
            Email customer
          </a>
        </Button>
      </div>

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

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Quote details</CardTitle>
              <CardDescription>
                This quote is read-only until it is moved back to draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailStat label="Customer" value={quote.customerName} />
              <DetailStat label="Email" value={quote.customerEmail} />
              <DetailStat
                label="Subtotal"
                value={formatQuoteMoney(quote.subtotalInCents, quote.currency)}
              />
              <DetailStat
                label="Total"
                value={formatQuoteMoney(quote.totalInCents, quote.currency)}
              />
              <DetailStat
                label="Sent"
                value={quote.sentAt ? formatQuoteDateTime(quote.sentAt) : "Not sent"}
              />
              <DetailStat
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
          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Activity log</CardTitle>
              <CardDescription>
                Quote lifecycle events and owner actions appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quote.activities.length ? (
                <div className="flex flex-col gap-3">
                  {quote.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-3xl border bg-background/80 p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.summary}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.actorName ?? "QuoteFlow"} ·{" "}
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
                    <EmptyDescription>
                      Draft saves, sends, and status changes will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Linked inquiry</CardTitle>
              <CardDescription>
                Preserve the inquiry relationship when the quote started from the
                inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quote.linkedInquiry ? (
                <div className="rounded-3xl border bg-background/80 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
                        Inquiry status {quote.linkedInquiry.status}
                      </span>
                      <span className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
                        Inquiry {quote.linkedInquiry.id}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailStat
                        label="Customer"
                        value={quote.linkedInquiry.customerName}
                      />
                      <DetailStat
                        label="Email"
                        value={quote.linkedInquiry.customerEmail}
                      />
                      <DetailStat
                        label="Category"
                        value={quote.linkedInquiry.serviceCategory}
                      />
                      <DetailStat
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
                    <EmptyDescription>
                      This quote was created manually instead of starting from the
                      inquiry inbox.
                    </EmptyDescription>
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
          {quote.status === "draft" ? (
            <Card className="bg-background/75">
              <CardHeader className="gap-2">
                <CardTitle>Send quote</CardTitle>
                <CardDescription>
                  Email the finished draft to the customer and mark it as sent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuoteSendForm
                  action={sendAction}
                  customerEmail={quote.customerEmail}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-background/75">
              <CardHeader className="gap-2">
                <CardTitle>Delivery state</CardTitle>
                <CardDescription>
                  Sent quotes stay read-only until they are intentionally moved
                  back to draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="rounded-3xl border bg-background/80 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Current status
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {quote.status === "sent"
                      ? "This quote has already been delivered to the customer."
                      : `This quote is currently ${quote.status}.`}
                  </p>
                </div>
                {quote.sentAt ? (
                  <div className="rounded-3xl border bg-background/80 p-4 text-sm text-muted-foreground">
                    Sent on {formatQuoteDateTime(quote.sentAt)}.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Move the quote through the MVP lifecycle without leaving the
                detail view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuoteStatusForm
                key={quote.status}
                action={statusAction}
                currentStatus={quote.status}
              />
            </CardContent>
          </Card>

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Quote summary</CardTitle>
              <CardDescription>
                Keep the commercial details visible while editing or reviewing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DetailStat label="Quote number" value={quote.quoteNumber} />
              <DetailStat label="Title" value={quote.title} />
              <DetailStat
                label="Valid until"
                value={formatQuoteDate(quote.validUntil)}
              />
              <DetailStat
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

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border bg-background/80 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
