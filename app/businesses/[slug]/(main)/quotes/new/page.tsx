import { notFound, redirect } from "next/navigation";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { createQuoteAction } from "@/features/quotes/actions";
import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { getQuoteLibraryForBusiness } from "@/features/quotes/quote-library-queries";
import { getInquiryQuotePrefillForBusiness } from "@/features/quotes/queries";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { inquiryRouteParamsSchema } from "@/features/inquiries/schemas";
import { workspacesHubPath } from "@/features/workspaces/routes";
import {
  createQuoteEditorLineItem,
  getDefaultQuoteValidityDate,
  getQuoteEditorInitialValuesFromInquiry,
} from "@/features/quotes/utils";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type NewQuotePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewQuotePage({
  params,
  searchParams,
}: NewQuotePageProps) {
  const [session, { slug }, rawSearchParams] = await Promise.all([
    requireSession(),
    params,
    searchParams,
  ]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  const rawInquiryId = Array.isArray(rawSearchParams.inquiryId)
    ? rawSearchParams.inquiryId[0]
    : rawSearchParams.inquiryId;
  const parsedInquiryId = inquiryRouteParamsSchema.safeParse({
    id: rawInquiryId,
  });
  const inquiryId = parsedInquiryId.success ? parsedInquiryId.data.id : undefined;
  const [businessSettings, inquiryPrefill, pricingLibrary] = await Promise.all([
    getBusinessSettingsForBusiness(businessContext.business.id),
    inquiryId
      ? getInquiryQuotePrefillForBusiness({
          businessId: businessContext.business.id,
          inquiryId,
        })
      : Promise.resolve(null),
    getQuoteLibraryForBusiness(businessContext.business.id),
  ]);

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
