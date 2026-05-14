import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { createQuoteAction } from "@/features/quotes/actions";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getInquiryQuotePrefillForBusiness } from "@/features/quotes/queries";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import {
  createQuoteEditorLineItem,
  getDefaultQuoteValidityDate,
  getQuoteEditorInitialValuesFromInquiry,
} from "@/features/quotes/utils";
import { getAppShellContext } from "@/lib/app-shell/context";
import { timed } from "@/lib/dev/server-timing";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { hasFeatureAccess } from "@/lib/plans";

type NewQuotePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "New quote",
  description: "Draft a new quote for a customer, optionally linked to an inquiry.",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function NewQuotePage({
  params,
  searchParams,
}: NewQuotePageProps) {
  const [{ slug }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { businessContext } = await getAppShellContext(slug);

  const rawInquiryId = Array.isArray(rawSearchParams.inquiryId)
    ? rawSearchParams.inquiryId[0]
    : rawSearchParams.inquiryId;
  const parsedInquiryId = inquiryRouteParamsSchema.safeParse({
    id: rawInquiryId,
  });
  const inquiryId = parsedInquiryId.success ? parsedInquiryId.data.id : undefined;
  const [businessSettings, inquiryPrefill, pricingLibrary] = await timed(
    "newQuote.parallelSettingsInquiryPricingLibrary",
    Promise.all([
      getBusinessSettingsForBusiness(businessContext.business.id),
      inquiryId
        ? getInquiryQuotePrefillForBusiness({
            businessId: businessContext.business.id,
            inquiryId,
          })
        : Promise.resolve(null),
      getQuoteLibraryForBusiness(businessContext.business.id),
    ]),
  );

  if (!businessSettings) {
    notFound();
  }

  if (rawInquiryId && inquiryId && !inquiryPrefill) {
    notFound();
  }

  const initialValues = inquiryPrefill
    ? getQuoteEditorInitialValuesFromInquiry(inquiryPrefill, {
        defaultQuoteNotes: businessSettings.defaultQuoteNotes,
        defaultQuoteValidityDays: businessSettings.defaultQuoteValidityDays,
      })
    : {
        title: "",
        customerName: "",
        customerEmail: null,
        customerContactMethod: "email" as const,
        customerContactHandle: "",
        notes: businessSettings.defaultQuoteNotes ?? "",
        validUntil: getDefaultQuoteValidityDate(
          businessSettings.defaultQuoteValidityDays,
        ),
        discount: "",
        discountType: "amount" as const,
        items: [createQuoteEditorLineItem()],
      };
  const linkedInquiry = inquiryPrefill
      ? {
          id: inquiryPrefill.id,
          customerName: inquiryPrefill.customerName,
          customerEmail: inquiryPrefill.customerEmail,
          customerContactMethod: inquiryPrefill.customerContactMethod,
          customerContactHandle: inquiryPrefill.customerContactHandle,
          recordState: inquiryPrefill.recordState,
          serviceCategory: inquiryPrefill.serviceCategory,
          status: inquiryPrefill.status,
        }
    : null;
  const action = createQuoteAction.bind(null, inquiryPrefill?.id ?? null);

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="New quote"
        title={
          linkedInquiry
            ? "Turn this inquiry into a quote"
            : "Create a new quote"
        }
      />

      <QuoteEditor
        action={action}
        businessName={businessContext.business.name}
        businessSlug={businessContext.business.slug}
        canUseAiGenerator={hasFeatureAccess(
          businessContext.business.plan,
          "aiAssistant",
        )}
        currency={businessContext.business.defaultCurrency}
        initialValues={initialValues}
        key={inquiryPrefill?.id ?? "manual"}
        linkedInquiry={linkedInquiry}
        pricingLibrary={pricingLibrary}
        submitLabel="Create draft quote"
        submitPendingLabel="Creating draft..."
      />
    </DashboardPage>
  );
}
