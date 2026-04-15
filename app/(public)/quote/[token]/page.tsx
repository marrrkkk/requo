import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { after } from "next/server";

import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { PoweredByRequo } from "@/components/shared/powered-by-requo";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicQuoteResponseForm } from "@/features/quotes/components/public-quote-response-form";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { respondToPublicQuoteAction } from "@/features/quotes/actions";
import { recordQuotePublicViewByToken } from "@/features/quotes/mutations";
import { getPublicQuoteByToken } from "@/features/quotes/queries";
import { quotePublicRouteParamsSchema } from "@/features/quotes/schemas";
import {
  formatQuoteDate,
  formatQuoteDateTime,
  formatQuoteMoney,
} from "@/features/quotes/utils";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const parsedParams = quotePublicRouteParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  const quote = await getPublicQuoteByToken(parsedParams.data.token);

  if (!quote) {
    notFound();
  }

  after(async () => {
    try {
      await recordQuotePublicViewByToken(quote.token);
    } catch (error) {
      console.error("Failed to record public quote view.", error);
    }
  });

  const respondAction = respondToPublicQuoteAction.bind(null, quote.token);
  const isActionable = quote.status === "sent";

  return (
    <PublicPageShell
      headerAction={
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Back to Requo
          </Link>
        </Button>
      }
    >
      <PublicHeroSurface className="lg:py-12">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.84fr)_minmax(24rem,1.16fr)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-4">
              <span className="eyebrow">Customer quote</span>
              <div className="flex flex-wrap items-center gap-3">
                <QuoteStatusBadge status={quote.status} />
                <span className="rounded-md border border-border/80 bg-background px-3 py-1 text-xs text-muted-foreground">
                  {quote.quoteNumber}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
                  {quote.title}
                </h1>
                <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {quote.businessShortDescription?.trim() ||
                    `${quote.businessName} prepared this quote for ${quote.customerName}. Review the details and respond when you're ready.`}
                </p>
              </div>
            </div>

            <Card className="gap-0 bg-background/94">
              <CardHeader className="gap-3 pb-5">
                <CardTitle>Quote summary</CardTitle>
                <CardDescription className="leading-7">
                  Review the scope, total, and validity date.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
                <Stat label="Prepared by" value={quote.businessName} />
                <Stat label="Prepared for" value={quote.customerName} />
                <Stat
                  label="Total"
                  value={formatQuoteMoney(quote.totalInCents, quote.currency)}
                />
                <Stat
                  label="Valid until"
                  value={formatQuoteDate(quote.validUntil)}
                />
              </CardContent>
            </Card>

            <Card className="gap-0 bg-background/94">
              <CardHeader className="gap-3 pb-5">
                <CardTitle>
                  {isActionable
                    ? "Ready to respond?"
                    : quote.status === "accepted"
                      ? "Quote accepted"
                      : quote.status === "rejected"
                        ? "Quote declined"
                        : "Quote no longer active"}
                </CardTitle>
                <CardDescription className="leading-7">
                  {isActionable
                    ? "Accept to confirm, or decline with an optional note."
                    : quote.status === "accepted"
                      ? "This quote has already been accepted and recorded."
                      : quote.status === "rejected"
                        ? "This quote has already been declined."
                        : "This quote is no longer accepting online responses."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                {isActionable ? (
                  <PublicQuoteResponseForm action={respondAction} />
                ) : (
                  <div className="soft-panel p-4 text-sm leading-7 text-muted-foreground">
                    {quote.customerRespondedAt ? (
                      <>
                        Response recorded on{" "}
                        {formatQuoteDateTime(quote.customerRespondedAt)}.
                      </>
                    ) : quote.status === "expired" ? (
                      <>
                        This quote expired on {formatQuoteDate(quote.validUntil)}.
                      </>
                    ) : (
                      "This quote is already closed."
                    )}
                  </div>
                )}

                {quote.customerResponseMessage ? (
                  <div className="soft-panel p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Message on file
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {quote.customerResponseMessage}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="gap-0 bg-background/94">
              <CardHeader className="gap-3 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle>Secure customer view</CardTitle>
                    <CardDescription className="leading-7">
                      This page only exposes the quote details needed to review
                      and respond.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {quote.businessContactEmail ? (
                <CardContent className="pt-0">
                  <Button asChild className="w-full sm:w-auto" variant="outline">
                    <a href={`mailto:${quote.businessContactEmail}`}>
                      <Mail data-icon="inline-start" />
                      Contact {quote.businessName}
                    </a>
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          </div>

          <QuotePreview
            businessName={quote.businessName}
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
            className="xl:sticky xl:top-6 xl:self-start"
          />
        </div>
      </PublicHeroSurface>

      {!hasFeatureAccess(quote.businessPlan, "branding") ? (
        <PoweredByRequo />
      ) : null}
    </PublicPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-tile shadow-none">
      <div className="flex flex-col gap-1">
        <p className="meta-label">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
