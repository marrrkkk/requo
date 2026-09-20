import Link from "next/link";
import { AtSign, ExternalLink, Mail, Receipt } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  DashboardDetailLayout,
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardDetailHeader,
  DashboardEmptyState,
  DashboardPage,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { ArchivedRecordBanner } from "@/components/shared/archived-record-banner";
import { DetailSectionFallback } from "@/components/shared/detail-section-fallback";
import { RegionErrorBoundary } from "@/components/shared/region-error-boundary";
import {
  DashboardDetailPageSkeleton,
  DashboardQuoteEditorSkeleton,
} from "@/components/shell/dashboard-detail-page-skeleton";
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
  acknowledgeQuoteUncertaintyAction,
  archiveQuoteAction,
  cancelAcceptedQuoteAction,
  completeAcceptedQuoteAction,
  deleteDraftQuoteAction,
  logQuoteSendEventAction,
  restoreArchivedQuoteAction,
  sendQuoteAction,
  stopAutoFollowUpAction,
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
import { CompleteAcceptedQuoteButton } from "@/features/quotes/components/complete-accepted-quote-button";
import { CopyQuoteLinkButton } from "@/features/quotes/components/copy-quote-link-button";
import { QuoteWorkflowSteps } from "@/features/businesses/components/workflow-steps";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { QuoteExportPopover } from "@/features/quotes/components/quote-export-popover";
import { QuoteManageDropdown } from "@/features/quotes/components/quote-manage-dropdown";
import { QuotePreviewButton } from "@/features/quotes/components/quote-preview-button";
import { hasFeatureAccess } from "@/lib/plans/entitlements";
import { getActiveAutoFollowUpCount } from "@/lib/plans/usage";
import { getUsageLimit } from "@/lib/plans/usage-limits";
import { saveQuoteAsTemplateAction } from "@/features/quotes/quote-library-actions";
import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { QuoteRecordStateBadge } from "@/features/quotes/components/quote-record-state-badge";
import { QuoteReminderBadge } from "@/features/quotes/components/quote-reminder-badge";
import { ReviseQuoteButton } from "@/features/quotes/components/revise-quote-button";
import { RevisionRequestFeedback } from "@/features/quotes/components/revision-request-feedback";
import { DismissibleQuoteAlert } from "@/features/quotes/components/dismissible-quote-alert";
import { SendQuoteDialog } from "@/features/quotes/components/send-quote-dialog";
import { AutoFollowUpStatus } from "@/features/quotes/components/auto-follow-up-status";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { getFollowUpsForQuote } from "@/features/follow-ups/queries";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import {
  getAcceptanceForBusiness,
  getBusinessContactEmailForPreview,
  getQuoteActivitiesForBusiness,
  getQuoteDetailCoreForBusiness,
  getQuoteItemsForBusiness,
  getRevisionRequestsForQuote,
} from "@/features/quotes/queries";
import { quoteRouteParamsSchema } from "@/features/quotes/schemas";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import type {
  DashboardQuoteActivity,
  DashboardQuoteDetailCore,
  QuoteReminderKind,
} from "@/features/quotes/types";
import {
  formatQuoteDate,
  formatQuoteDateTime,
  getPublicQuoteUrl,
  getQuoteEditorInitialValuesFromDetail,
} from "@/features/quotes/utils";
import {
  getBusinessInquiryPath,
  getBusinessInvoicePath,
  getBusinessNewInvoicePath,
  getBusinessQuoteExportPath,
  getBusinessQuotePath,
  getBusinessQuotePreviewPath,
  getBusinessQuotesPath,
} from "@/features/businesses/routes";
import { getInvoiceIdByQuoteId } from "@/features/invoices/queries";
import { env, isEmailConfigured } from "@/lib/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";
import type { Metadata } from "next";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Quote detail",
  description: "View, edit, send, or track a single quote for this business.",
});

type QuoteDetailPageProps = {
  params: Promise<{ businessSlug: string; id: string }>;
};

export const instant = true;

/**
 * Quote detail page — returns the structural shell synchronously.
 *
 * All dynamic reads (params, getAppShellContext, quote queries) are pushed into
 * a `<Suspense>`-wrapped child server component so the shell paints instantly
 * on client navigation. The error boundary catches failures without breaking
 * the surrounding layout.
 *
 * Staging: the frame resolves the core row plus the two cheap lookups the
 * header's actions need (contact email, linked invoice). Pricing library and
 * business settings (editor-only), line items, activity, follow-ups, and
 * customer history each stream behind their own region, so the published view
 * never waits on draft-only data and a slow feed never holds back the header.
 */
export default function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  return (
    <RegionErrorBoundary fallback={<DashboardDetailPageSkeleton variant="quote" />}>
      <Suspense fallback={<DashboardDetailPageSkeleton variant="quote" />}>
        <QuoteDetailRegion params={params} />
      </Suspense>
    </RegionErrorBoundary>
  );
}

/* -------------------------------------------------------------------------- */
/*  Frame — params + context + core row + header actions                      */
/* -------------------------------------------------------------------------- */

async function QuoteDetailRegion({ params }: QuoteDetailPageProps) {
  const resolvedParams = await params;
  const { businessContext } = await getAppShellContext(resolvedParams.businessSlug);

  const parsedParams = quoteRouteParamsSchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    notFound();
  }
  const businessSlug = businessContext.business.slug;
  const businessId = businessContext.business.id;
  const quoteId = parsedParams.data.id;

  const [quote, businessContactEmail, linkedInvoice, acceptance] = await Promise.all([
    getQuoteDetailCoreForBusiness({ businessId, quoteId }),
    getBusinessContactEmailForPreview(businessId),
    getInvoiceIdByQuoteId({ businessId, quoteId }).catch((error) => {
      console.error("Failed to load linked invoice.", { quoteId }, error);
      return null;
    }),
    getAcceptanceForBusiness({ businessId, quoteId }).catch((error) => {
      console.error("Failed to load quote acceptance.", { quoteId }, error);
      return null;
    }),
  ]);

  if (!quote) {
    notFound();
  }

  const updateAction = updateQuoteAction.bind(null, quote.id);
  const archiveAction = archiveQuoteAction.bind(null, quote.id);
  const deleteDraftAction = deleteDraftQuoteAction.bind(null, quote.id);
  const cancelAction = cancelAcceptedQuoteAction.bind(null, quote.id);
  const completeAction = completeAcceptedQuoteAction.bind(null, quote.id);
  const restoreArchivedAction = restoreArchivedQuoteAction.bind(null, quote.id);
  const sendAction = sendQuoteAction.bind(null, quote.id);
  const logEventAction = logQuoteSendEventAction.bind(null, quote.id);
  const createFollowUpAction = createQuoteFollowUpAction.bind(null, quote.id);
  const voidAction = voidQuoteAction.bind(null, quote.id);
  const stopAutoFollowUp = stopAutoFollowUpAction.bind(null, quote.id);
  const saveAsTemplate = saveQuoteAsTemplateAction.bind(null, quote.id);
  const canSaveAsTemplate = hasFeatureAccess(
    businessContext.business.plan,
    "quoteLibrary",
  );
  const customerQuotePath = quote.publicToken
    ? getPublicQuoteUrl(quote.publicToken)
    : null;
  const customerQuoteUrl = customerQuotePath
    ? new URL(customerQuotePath, env.BETTER_AUTH_URL).toString()
    : null;

  const isArchived = quote.archivedAt !== null;
  const viewedWithoutResponse = Boolean(
    quote.status === "sent" &&
      quote.publicViewedAt &&
      !quote.customerRespondedAt,
  );
  const visibleQuoteReminders = quote.reminders.filter(
    (reminder) => reminder !== "follow_up_due",
  );
  const customerViewCopy =
    quote.status === "sent"
      ? {
          title: "Waiting for customer response",
        }
      : quote.status === "voided"
        ? {
            title: "Quote voided",
          }
        : {
            title: `Quote ${quote.status}`,
          };
  const quoteContactEmail = getCustomerContactEmail(quote);
  const showQuotePreferredContact = shouldShowPreferredContactTile(quote);
  const quotePreferredContactLabel = getContactMethodLabel(
    quote.customerContactMethod,
  );
  const canExportData = hasFeatureAccess(
    businessContext.business.plan,
    "exports",
  );
  const needsAiConfirmation =
    quote.status === "draft" &&
    quote.aiReadiness === "needs_confirmation" &&
    !quote.aiAcknowledgedAt;
  const acknowledgeAction =
    quote.status === "draft"
      ? acknowledgeQuoteUncertaintyAction.bind(null, quote.id)
      : undefined;

  const sendDialogContext = {
    businessId,
    businessName: businessContext.business.name,
    businessPlan: businessContext.business.plan,
    businessSlug,
    businessLogoStoragePath: businessContext.business.logoStoragePath,
    canExportData,
    customerQuoteUrl,
    needsAiConfirmation,
    acknowledgeAction,
    quote,
    sendAction,
    logEventAction,
    createFollowUpAction,
    previewHref: getBusinessQuotePreviewPath(businessSlug, quote.id),
  };

  return (
    <DashboardPage className="pb-24">
      {isArchived ? (
        <ArchivedRecordBanner
          recordLabel="quote"
          redirectHref={getBusinessQuotePath(businessSlug, quote.id)}
          unarchiveAction={restoreArchivedAction}
        />
      ) : null}
      <DashboardDetailHeader
        eyebrow="Quote"
        title={quote.title}
        description={`Quote created · ${formatQuoteDateTime(quote.createdAt)}`}
        meta={
          <>
            <QuoteStatusBadge status={quote.status} />
            {isArchived ? <QuoteRecordStateBadge state="archived" /> : null}
          </>
        }
        actions={
          <div className="grid w-full gap-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">

            <QuoteManageDropdown
              archiveAction={archiveAction}
              businessQuoteListHref={getBusinessQuotesPath(businessSlug)}
              deleteDraftAction={deleteDraftAction}
              isArchived={isArchived}
              restoreArchivedAction={restoreArchivedAction}
              saveAsTemplateAction={canSaveAsTemplate ? saveAsTemplate : undefined}
              status={quote.status}
              voidAction={voidAction}
            />
            <QuoteExportPopover
              canExport={canExportData}
              pdfHref={getBusinessQuoteExportPath(businessSlug, quote.id, "pdf")}
              pngHref={getBusinessQuoteExportPath(businessSlug, quote.id, "png")}
            />
            {/* Preview and the draft send dialog both need the line items, so
                they resolve in one feed region instead of holding the
                header's identity and management actions. */}
            <Suspense fallback={<QuoteHeaderActionsFallback />}>
              <QuoteHeaderFeedActionsRegion
                {...sendDialogContext}
                businessContactEmail={businessContactEmail}
                openQuoteHref={customerQuoteUrl}
              />
            </Suspense>
            {quote.status === "accepted" && linkedInvoice ? (
              <Button asChild variant="outline">
                <Link href={getBusinessInvoicePath(businessSlug, linkedInvoice.id)}>
                  <Receipt data-icon="inline-start" />
                  View invoice {linkedInvoice.invoiceNumber}
                </Link>
              </Button>
            ) : null}
            {quote.status === "accepted" && !linkedInvoice ? (
              <Button asChild>
                <Link href={getBusinessNewInvoicePath(businessSlug, quote.id)}>
                  <Receipt data-icon="inline-start" />
                  Create invoice
                </Link>
              </Button>
            ) : null}
            {quote.status === "accepted" && !quote.completedAt && !quote.canceledAt ? (
              <CompleteAcceptedQuoteButton completeAction={completeAction} />
            ) : null}
          </div>
        }
      />

      <QuoteWorkflowSteps
        status={quote.status}
        publicViewedAt={quote.publicViewedAt}
      />

      {quote.status === "draft" ? (
        <>
          <Suspense fallback={<DashboardQuoteEditorSkeleton />}>
            <QuoteEditorRegion
              businessId={businessId}
              businessName={businessContext.business.name}
              businessPlan={businessContext.business.plan}
              businessSlug={businessSlug}
              quote={quote}
              updateAction={updateAction}
            />
          </Suspense>

          <DashboardDetailLayout className="xl:grid-cols-[1.25fr_0.75fr]">
            <DashboardSidebarStack>
              <QuoteLinkedInquirySection businessSlug={businessSlug} quote={quote} />
              <Suspense fallback={<DetailSectionFallback rows={2} />}>
                <QuoteActivityRegion businessId={businessId} quoteId={quote.id} />
              </Suspense>
              <RegionErrorBoundary fallback={<QuoteCustomerHistoryFallback />}>
                <Suspense fallback={<QuoteCustomerHistoryFallback />}>
                  <QuoteCustomerHistoryRegion
                    businessId={businessId}
                    businessSlug={businessSlug}
                    customerContactHandle={quote.customerContactHandle}
                    customerEmail={quote.customerEmail}
                    excludeInquiryId={quote.inquiryId}
                    excludeQuoteId={quote.id}
                  />
                </Suspense>
              </RegionErrorBoundary>
            </DashboardSidebarStack>

            <DashboardSidebarStack>
              <div id="send-quote">
                <DashboardSection
                  description="Send the finished draft to your customer."
                  title="Send quote"
                >
                  <Suspense fallback={<DetailSectionFallback rows={3} />}>
                    <QuoteSendSectionRegion {...sendDialogContext} />
                  </Suspense>
                </DashboardSection>
              </div>

              <div id="follow-ups">
                <RegionErrorBoundary fallback={<FollowUpPanelFallback />}>
                  <Suspense fallback={<FollowUpPanelFallback />}>
                    <QuoteFollowUpsRegion
                      businessId={businessId}
                      businessPlan={businessContext.business.plan}
                      businessSlug={businessSlug}
                      createFollowUpAction={createFollowUpAction}
                      mode="draft"
                      quote={quote}
                      stopAutoFollowUp={stopAutoFollowUp}
                    />
                  </Suspense>
                </RegionErrorBoundary>
              </div>
            </DashboardSidebarStack>
          </DashboardDetailLayout>
        </>
      ) : (
        <DashboardDetailLayout className="xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
          <DashboardSidebarStack>

            <Suspense fallback={<DetailSectionFallback rows={6} />}>
              <QuotePreviewRegion
                businessId={businessId}
                businessName={businessContext.business.name}
                quote={quote}
              />
            </Suspense>

            <QuoteLinkedInquirySection businessSlug={businessSlug} quote={quote} />
            <Suspense fallback={<DetailSectionFallback rows={2} />}>
              <QuoteActivityRegion businessId={businessId} quoteId={quote.id} />
            </Suspense>
            <RegionErrorBoundary fallback={<QuoteCustomerHistoryFallback />}>
              <Suspense fallback={<QuoteCustomerHistoryFallback />}>
                <QuoteCustomerHistoryRegion
                  businessId={businessId}
                  businessSlug={businessSlug}
                  customerContactHandle={quote.customerContactHandle}
                  customerEmail={quote.customerEmail}
                  excludeInquiryId={quote.inquiryId}
                  excludeQuoteId={quote.id}
                />
              </Suspense>
            </RegionErrorBoundary>
          </DashboardSidebarStack>

          <DashboardSidebarStack>
            {quote.status === "revision_requested" ? (
              <Suspense fallback={<DetailSectionFallback rows={3} />}>
                <QuoteRevisionSectionRegion businessId={businessId} quoteId={quote.id} />
              </Suspense>
            ) : null}

            <QuoteCustomerViewSection
              customerQuotePath={customerQuotePath}
              customerQuoteUrl={customerQuoteUrl}
              customerViewCopy={customerViewCopy}
              quote={quote}
              visibleQuoteReminders={visibleQuoteReminders}
            />

            {quote.status === "accepted" ? (
              <QuoteAcceptanceSection acceptance={acceptance} quote={quote} />
            ) : null}

            <QuoteContactSection
              quote={quote}
              quoteContactEmail={quoteContactEmail}
              quotePreferredContactLabel={quotePreferredContactLabel}
              showQuotePreferredContact={showQuotePreferredContact}
            />

            <div id="follow-ups">
              <RegionErrorBoundary fallback={<FollowUpPanelFallback />}>
                <Suspense fallback={<FollowUpPanelFallback />}>
                  <QuoteFollowUpsRegion
                    businessId={businessId}
                    businessPlan={businessContext.business.plan}
                    businessSlug={businessSlug}
                    createFollowUpAction={createFollowUpAction}
                    mode="published"
                    quote={quote}
                    stopAutoFollowUp={stopAutoFollowUp}
                    viewedWithoutResponse={viewedWithoutResponse}
                  />
                </Suspense>
              </RegionErrorBoundary>
            </div>

            {visibleQuoteReminders.includes("expiring_soon") ? (
              <DismissibleQuoteAlert
                id={`quote-${quote.id}-expiring`}
                title="Quote expiring soon"
                description={`This quote expires on ${formatQuoteDate(quote.validUntil)}.`}
              />
            ) : null}
          </DashboardSidebarStack>
        </DashboardDetailLayout>
      )}
    </DashboardPage>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streaming regions                                                         */
/* -------------------------------------------------------------------------- */

type SendDialogContext = {
  businessId: string;
  businessName: string;
  businessPlan: Parameters<typeof hasFeatureAccess>[0];
  businessSlug: string;
  businessLogoStoragePath: string | null;
  canExportData: boolean;
  customerQuoteUrl: string | null;
  needsAiConfirmation: boolean;
  acknowledgeAction?: React.ComponentProps<typeof SendQuoteDialog>["acknowledgeAction"];
  quote: DashboardQuoteDetailCore;
  sendAction: React.ComponentProps<typeof SendQuoteDialog>["sendAction"];
  logEventAction: React.ComponentProps<typeof SendQuoteDialog>["logEventAction"];
  createFollowUpAction: React.ComponentProps<typeof SendQuoteDialog>["createFollowUpAction"];
  previewHref: string;
};

async function QuoteHeaderFeedActionsRegion(
  props: SendDialogContext & {
    businessContactEmail: string | null;
    openQuoteHref: string | null;
  },
) {
  const [items, gate] = await Promise.all([
    getQuoteItemsForBusiness({ businessId: props.businessId, quoteId: props.quote.id }),
    resolveAutoFollowUpGate(props.businessId, props.businessPlan),
  ]);

  return (
    <>
      <QuotePreviewButton
        quote={{
          id: props.quote.id,
          businessId: props.businessId,
          token: props.quote.publicToken ?? "",
          quoteNumber: props.quote.quoteNumber,
          title: props.quote.title,
          businessName: props.businessName,
          businessSlug: props.businessSlug,
          businessPlan: props.businessPlan,
          businessShortDescription: null,
          businessContactEmail: props.businessContactEmail,
          businessLogoStoragePath: props.businessLogoStoragePath,
          customerName: props.quote.customerName,
          customerEmail: props.quote.customerEmail,
          customerContactMethod: props.quote.customerContactMethod,
          customerContactHandle: props.quote.customerContactHandle,
          currency: props.quote.currency,
          notes: props.quote.notes,
          terms: props.quote.terms,
          validUntil: props.quote.validUntil,
          version: props.quote.version,
          status: props.quote.status,
          subtotalInCents: props.quote.subtotalInCents,
          discountInCents: props.quote.discountInCents,
          taxInCents: props.quote.taxInCents,
          taxLabel: props.quote.taxLabel,
          totalInCents: props.quote.totalInCents,
          sentAt: props.quote.sentAt,
          acceptedAt: props.quote.acceptedAt,
          publicViewedAt: props.quote.publicViewedAt,
          customerRespondedAt: props.quote.customerRespondedAt,
          customerResponseMessage: props.quote.customerResponseMessage,
          items,
        }}
        businessPlan={props.businessPlan}
        businessContactEmail={props.businessContactEmail}
        businessName={props.businessName}
        openQuoteHref={props.openQuoteHref}
      />
      {props.quote.status === "draft" ? (
        <SendQuoteDialog {...buildSendDialogProps({ ...props, ...gate, items })} />
      ) : null}
    </>
  );
}

async function QuoteSendSectionRegion(props: SendDialogContext) {
  const [items, gate] = await Promise.all([
    getQuoteItemsForBusiness({ businessId: props.businessId, quoteId: props.quote.id }),
    resolveAutoFollowUpGate(props.businessId, props.businessPlan),
  ]);

  return <SendQuoteDialog {...buildSendDialogProps({ ...props, ...gate, items })} />;
}

async function QuoteEditorRegion({
  businessId,
  businessName,
  businessPlan,
  businessSlug,
  quote,
  updateAction,
}: {
  businessId: string;
  businessName: string;
  businessPlan: Parameters<typeof hasFeatureAccess>[0];
  businessSlug: string;
  quote: DashboardQuoteDetailCore;
  updateAction: React.ComponentProps<typeof QuoteEditor>["action"];
}) {
  // Editor-only payload: the pricing library and business defaults are not
  // needed by the published view, so they load here instead of in the frame.
  const [items, pricingLibrary, businessSettings, revisionRequests] =
    await Promise.all([
      getQuoteItemsForBusiness({ businessId, quoteId: quote.id }),
      getQuoteLibraryForBusiness(businessId),
      getBusinessSettingsForBusiness(businessId),
      quote.status === "revision_requested" || quote.status === "draft"
        ? getRevisionRequestsForQuote(businessId, quote.id)
        : Promise.resolve([]),
    ]);

  const linkedInquiry = quote.linkedInquiry;

  return (
    <>
      {revisionRequests.length > 0 ? (
        <DashboardSection
          description="Customer feedback from the previous version. Use this to guide your edits."
          title="Revision feedback"
        >
          <RevisionRequestFeedback requests={revisionRequests} />
        </DashboardSection>
      ) : null}

      <QuoteEditor
        action={updateAction}
        businessDefaults={
          businessSettings
            ? {
                defaultQuoteNotes: businessSettings.defaultQuoteNotes,
                defaultQuoteTerms: businessSettings.defaultQuoteTerms,
                defaultQuoteValidityDays: businessSettings.defaultQuoteValidityDays,
              }
            : undefined
        }
        businessName={businessName}
        businessSlug={businessSlug}
        canUseAiGenerator={hasFeatureAccess(businessPlan, "aiQuoteDrafting")}
        canUseQuoteLibrary={hasFeatureAccess(businessPlan, "quoteLibrary")}
        currency={quote.currency}
        initialValues={getQuoteEditorInitialValuesFromDetail({
          ...quote,
          items,
        })}
        key={quote.id}
        linkedInquiry={linkedInquiry}
        pricingLibrary={pricingLibrary}
        quoteNumber={quote.quoteNumber}
        revisionComment={revisionRequests[0]?.message ?? null}
        showFloatingUnsavedChanges
        submitLabel="Save changes"
        submitPendingLabel="Saving changes..."
      />
    </>
  );
}

async function QuotePreviewRegion({
  businessId,
  businessName,
  quote,
}: {
  businessId: string;
  businessName: string;
  quote: DashboardQuoteDetailCore;
}) {
  const items = await getQuoteItemsForBusiness({
    businessId,
    quoteId: quote.id,
  });

  return (
    <QuotePreview
      businessName={businessName}
      quoteNumber={quote.quoteNumber}
      title={quote.title}
      customerName={quote.customerName}
      customerEmail={quote.customerEmail}
      currency={quote.currency}
      validUntil={quote.validUntil}
      notes={quote.notes}
      terms={quote.terms}
      items={items}
      subtotalInCents={quote.subtotalInCents}
      discountInCents={quote.discountInCents}
      taxInCents={quote.taxInCents}
      taxLabel={quote.taxLabel}
      totalInCents={quote.totalInCents}
    />
  );
}

async function QuoteActivityRegion({
  businessId,
  quoteId,
}: {
  businessId: string;
  quoteId: string;
}) {
  const activities = await getQuoteActivitiesForBusiness({ businessId, quoteId });

  return <QuoteActivitySheetSection activities={activities} />;
}

async function QuoteCustomerHistoryRegion({
  businessId,
  businessSlug,
  customerContactHandle,
  customerEmail,
  excludeInquiryId,
  excludeQuoteId,
}: {
  businessId: string;
  businessSlug: string;
  customerContactHandle: string;
  customerEmail: string | null;
  excludeInquiryId: string | null;
  excludeQuoteId: string | null;
}) {
  const history = await getCustomerHistoryForBusiness({
    businessId,
    customerEmail,
    customerContactHandle,
    excludeInquiryId,
    excludeQuoteId,
  });

  return (
    <CustomerHistorySheetSection history={history} businessSlug={businessSlug} />
  );
}

async function QuoteRevisionSectionRegion({
  businessId,
  quoteId,
}: {
  businessId: string;
  quoteId: string;
}) {
  const revisionRequests = await getRevisionRequestsForQuote(businessId, quoteId);

  return (
    <DashboardSection
      description="The customer has requested changes. Review their feedback, then create a new version to edit and re-send."
      title="Revision requested"
    >
      <RevisionRequestFeedback requests={revisionRequests} />
      <div className="mt-4">
        <ReviseQuoteButton quoteId={quoteId} />
      </div>
    </DashboardSection>
  );
}

async function QuoteFollowUpsRegion({
  businessId,
  businessPlan,
  businessSlug,
  createFollowUpAction,
  mode,
  quote,
  stopAutoFollowUp,
  viewedWithoutResponse = false,
}: {
  businessId: string;
  businessPlan: Parameters<typeof hasFeatureAccess>[0];
  businessSlug: string;
  createFollowUpAction: React.ComponentProps<typeof FollowUpPanel>["createAction"];
  mode: "draft" | "published";
  quote: DashboardQuoteDetailCore;
  stopAutoFollowUp: React.ComponentProps<typeof AutoFollowUpStatus>["stopAction"];
  viewedWithoutResponse?: boolean;
}) {
  const [followUps, gate] = await Promise.all([
    getFollowUpsForQuote({ businessId, quoteId: quote.id }),
    resolveAutoFollowUpGate(businessId, businessPlan),
  ]);

  const hasPendingFollowUp = followUps.some(
    (followUp) => followUp.status === "pending",
  );

  return (
    <>
      {quote.autoFollowUpEnabled ? (
        <AutoFollowUpStatus
          enabled={quote.autoFollowUpEnabled}
          attempts={quote.autoFollowUpAttempts}
          maxAttempts={quote.autoFollowUpMaxAttempts}
          delayDays={quote.autoFollowUpDelayDays}
          lastSentAt={quote.autoFollowUpLastSentAt}
          stoppedAt={quote.autoFollowUpStoppedAt}
          activeCount={gate.activeAutoFollowUpCount}
          activeLimit={gate.activeAutoFollowUpLimit}
          stopAction={stopAutoFollowUp}
        />
      ) : null}
      <FollowUpPanel
        businessSlug={businessSlug}
        createAction={createFollowUpAction}
        ctaDescription={
          mode === "published" && viewedWithoutResponse
            ? "Set a reminder to follow up now that the customer has viewed this quote."
            : "Set a reminder to check back after sharing this quote."
        }
        defaultChannel={quote.customerContactMethod}
        defaultReason={
          mode === "published" && viewedWithoutResponse
            ? "Follow up because the customer viewed this quote but has not responded."
            : "Follow up with the customer about this quote if they have not responded."
        }
        defaultTitle={`Follow up on quote ${quote.quoteNumber}`}
        followUps={followUps}
        sharedQuoteWithoutFollowUp={
          mode === "published" && quote.status === "sent" && !hasPendingFollowUp
        }
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sections                                                                  */
/* -------------------------------------------------------------------------- */

function QuoteLinkedInquirySection({
  businessSlug,
  quote,
}: {
  businessSlug: string;
  quote: DashboardQuoteDetailCore;
}) {
  return (
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
                    text={quote.linkedInquiry.subject ?? quote.linkedInquiry.customerName}
                  />
                </>
              }
              title={quote.linkedInquiry.customerName}
            />
          </DashboardDetailFeed>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Subject" value={quote.linkedInquiry.subject ?? "—"} />
            <InfoTile label="Deadline" value={quote.linkedInquiry.requestedDeadline ?? "No deadline"} />
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
}

function QuoteCustomerViewSection({
  customerQuotePath,
  customerQuoteUrl,
  customerViewCopy,
  quote,
  visibleQuoteReminders,
}: {
  customerQuotePath: string | null;
  customerQuoteUrl: string | null;
  customerViewCopy: { title: string };
  quote: DashboardQuoteDetailCore;
  visibleQuoteReminders: QuoteReminderKind[];
}) {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-3"
      description="Share, open, and track the secure quote page."
      title="Customer view"
    >
      {customerQuoteUrl ? (
        <>
          <div className={cn(
            "rounded-xl border px-4 py-4 shadow-none",
            quote.status === "accepted" && "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30",
            quote.status === "rejected" && "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30",
            quote.status !== "accepted" && quote.status !== "rejected" && "soft-panel",
          )}>
            <p className="text-sm font-medium text-foreground">
              {customerViewCopy.title}
            </p>
            <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {quote.sentAt ? (
                <span>Sent {formatQuoteDateTime(quote.sentAt)}</span>
              ) : null}
              <span>
                {quote.publicViewedAt
                  ? `Viewed ${formatQuoteDateTime(quote.publicViewedAt)}`
                  : "Not viewed yet"}
              </span>
              {quote.customerRespondedAt ? (
                <span>Responded {formatQuoteDateTime(quote.customerRespondedAt)}</span>
              ) : null}
            </div>
          </div>

          {quote.customerResponseMessage ? (
            <div className="soft-panel shadow-none">
              <p className="meta-label">Customer message</p>
              <TruncatedTextWithTooltip
                className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground"
                lines={4}
                text={quote.customerResponseMessage}
              />
            </div>
          ) : null}

          {visibleQuoteReminders.length ? (
            <div className="flex flex-wrap gap-2">
              {visibleQuoteReminders.map((reminder) => (
                <QuoteReminderBadge key={reminder} kind={reminder} />
              ))}
            </div>
          ) : null}

          {customerQuotePath ? (
            <div className="flex items-center gap-2">
              <CopyQuoteLinkButton url={customerQuoteUrl} />
              <Button asChild size="sm" variant="ghost">
                <Link href={customerQuotePath} target="_blank">
                  Open
                  <ExternalLink data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          ) : null}
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
    </DashboardSection>
  );
}

function QuoteAcceptanceSection({
  acceptance,
  quote,
}: {
  acceptance: {
    signerName: string;
    signerEmail: string | null;
    acceptanceMethod: string;
    acceptanceText: string;
    quoteVersion: number;
    snapshotHash: string;
    acceptedAt: Date;
  } | null;
  quote: DashboardQuoteDetailCore;
}) {
  if (!acceptance) {
    return (
      <DashboardSection
        contentClassName="flex flex-col gap-3"
        description="Acceptance record for this quote."
        title="Acceptance"
      >
        <p className="text-sm text-muted-foreground">
          Accepted{quote.acceptedAt ? ` ${formatQuoteDateTime(quote.acceptedAt)}` : ""} (legacy
          record — signer details were not captured).
        </p>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      contentClassName="grid gap-3 sm:grid-cols-2"
      description="Immutable record of what the customer accepted."
      title="Acceptance"
    >
      <InfoTile label="Accepted by" value={acceptance.signerName} />
      <InfoTile label="Accepted on" value={formatQuoteDateTime(acceptance.acceptedAt)} />
      <InfoTile label="Accepted version" value={`v${acceptance.quoteVersion}`} />
      {quote.completedAt ? (
        <InfoTile
          className="sm:col-span-2"
          label="Work completed"
          value={formatQuoteDateTime(quote.completedAt)}
        />
      ) : null}
      {acceptance.signerEmail ? (
        <InfoTile className="sm:col-span-2" label="Signer email" value={acceptance.signerEmail} valueClassName="break-all" />
      ) : null}
      <div className="sm:col-span-2">
        <InfoTile label="Snapshot hash" value={`${acceptance.snapshotHash.slice(0, 16)}…`} valueClassName="break-all font-mono text-xs" />
      </div>
    </DashboardSection>
  );
}

function QuoteContactSection({
  quote,
  quoteContactEmail,
  quotePreferredContactLabel,
  showQuotePreferredContact,
}: {
  quote: DashboardQuoteDetailCore;
  quoteContactEmail: string | null;
  quotePreferredContactLabel: string;
  showQuotePreferredContact: boolean;
}) {
  return (
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
          value={
            getContactHandleUrl(quote.customerContactMethod, quote.customerContactHandle) ? (
              <a
                className="text-primary underline-offset-4 hover:underline break-all"
                href={getContactHandleUrl(quote.customerContactMethod, quote.customerContactHandle)!}
                rel="noopener noreferrer"
                target="_blank"
              >
                {quote.customerContactHandle}
              </a>
            ) : (
              quote.customerContactHandle
            )
          }
          valueClassName="break-all"
        />
      ) : null}
    </DashboardSection>
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
                <ScrollArea className="h-full pr-4">
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
                <ScrollArea className="h-full pr-4">
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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Plan gate + in-flight count for auto follow-up, shared by the send dialog
 * and the follow-up panel regions.
 */
// (see resolveAutoFollowUpGate below)
async function resolveAutoFollowUpGate(
  businessId: string,
  businessPlan: Parameters<typeof hasFeatureAccess>[0],
) {
  const canAutoFollowUpByPlan = hasFeatureAccess(businessPlan, "autoFollowUps");
  const activeAutoFollowUpLimit = getUsageLimit(
    businessPlan,
    "activeAutoFollowUpsPerBusiness",
  );
  const activeAutoFollowUpCount = canAutoFollowUpByPlan
    ? await getActiveAutoFollowUpCount(businessId)
    : 0;
  const canAutoFollowUp =
    canAutoFollowUpByPlan &&
    (activeAutoFollowUpLimit === null ||
      activeAutoFollowUpCount < activeAutoFollowUpLimit);

  return {
    canAutoFollowUp,
    activeAutoFollowUpCount,
    activeAutoFollowUpLimit,
    autoFollowUpUnavailableNote:
      canAutoFollowUpByPlan && !canAutoFollowUp
        ? "You've reached your plan's limit for active auto follow-ups. Stop or complete one to start another."
        : undefined,
  };
}

function buildSendDialogProps({
  acknowledgeAction,
  autoFollowUpUnavailableNote,
  businessLogoStoragePath,
  businessName,
  businessPlan,
  businessSlug,
  canAutoFollowUp,
  canExportData,
  createFollowUpAction,
  customerQuoteUrl,
  items,
  logEventAction,
  needsAiConfirmation,
  previewHref,
  quote,
  sendAction,
}: SendDialogContext & {
  items: React.ComponentProps<typeof QuotePreview>["items"];
  canAutoFollowUp: boolean;
  autoFollowUpUnavailableNote?: string;
}): React.ComponentProps<typeof SendQuoteDialog> {
  return {
    sendAction,
    logEventAction,
    createFollowUpAction,
    quote,
    customerQuoteUrl,
    businessName,
    isRequoEmailAvailable:
      isEmailConfigured &&
      quote.customerContactMethod === "email" &&
      !!quote.customerEmail,
    pdfExportHref: canExportData
      ? getBusinessQuoteExportPath(businessSlug, quote.id, "pdf")
      : undefined,
    pdfExportLocked: !canExportData,
    canAutoFollowUp,
    autoFollowUpUnavailableNote,
    unpricedItemCount: items.filter((item) => item.unitPriceInCents <= 0).length,
    needsAiConfirmation,
    acknowledgeAction,
    previewHref,
    previewData: {
      businessName,
      businessLogoStoragePath,
      businessSlug,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      currency: quote.currency,
      validUntil: quote.validUntil,
      notes: quote.notes,
      terms: quote.terms,
      items,
      subtotalInCents: quote.subtotalInCents,
      discountInCents: quote.discountInCents,
      taxInCents: quote.taxInCents,
      taxLabel: quote.taxLabel,
      totalInCents: quote.totalInCents,
      version: quote.version,
      showWatermark: !hasFeatureAccess(businessPlan, "removeWatermark"),
    },
  };
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
  customerEmail?: string | null;
  customerContactMethod: string;
  customerContactHandle: string;
}) {
  const handle = contact.customerContactHandle.trim();
  if (!handle) return false;

  const normalizedMethod = contact.customerContactMethod.trim().toLowerCase();
  if (normalizedMethod === "email") {
    // Hide when the handle is the same email already shown in the Email tile
    return handle.toLowerCase() !== (contact.customerEmail?.trim().toLowerCase() ?? "");
  }
  return true;
}

function getContactHandleUrl(method: string, handle: string): string | null {
  const normalizedMethod = method.trim().toLowerCase();
  const trimmedHandle = handle.trim();
  if (!trimmedHandle) return null;

  switch (normalizedMethod) {
    case "facebook":
      return `https://facebook.com/${trimmedHandle}`;
    case "instagram":
      return `https://instagram.com/${trimmedHandle}`;
    case "whatsapp":
      return `https://wa.me/${trimmedHandle.replace(/[^0-9+]/g, "")}`;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */

/** Header-slot placeholder for the item-dependent header actions. */
function QuoteHeaderActionsFallback() {
  return (
    <>
      <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-28" />
      <Skeleton className="h-9 w-full rounded-md sm:h-8 sm:w-32" />
    </>
  );
}

function FollowUpPanelFallback() {
  return (
    <DashboardSection
      description="Loading follow-up reminders..."
      title="Follow-ups"
    >
      <div className="flex flex-col gap-3">
        <div className="soft-panel animate-pulse shadow-none">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="mt-2 h-3 w-64 rounded bg-muted" />
        </div>
      </div>
    </DashboardSection>
  );
}

function QuoteCustomerHistoryFallback() {
  return (
    <DashboardSection
      contentClassName="flex flex-col gap-4"
      description="Past records for this customer."
      title="Customer history"
    >
      <div className="grid animate-pulse gap-3 sm:grid-cols-2">
        <div className="soft-panel shadow-none">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-2 h-5 w-8 rounded bg-muted" />
        </div>
        <div className="soft-panel shadow-none">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-2 h-5 w-8 rounded bg-muted" />
        </div>
      </div>
    </DashboardSection>
  );
}
