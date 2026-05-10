import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  createBusinessInquiryFormAction,
  unarchiveBusinessInquiryFormAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormsManager } from "@/features/settings/components/business-inquiry-forms-manager";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { getBusinessOperationalPageContext } from "../settings/_lib/page-context";

export const metadata: Metadata = {
  title: "Forms",
};

export const unstable_instant = { prefetch: 'static' as const };

export default async function BusinessFormsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const [settings, billingOverview] = await Promise.all([
    getBusinessInquiryFormsSettingsForBusiness(businessContext.business.id),
    getBusinessBillingOverview(businessContext.business.id),
  ]);

  if (!settings) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Forms"
        description="Manage inquiry capture, public URLs, and starting intake defaults."
      />

      <BusinessInquiryFormsManager
        createAction={createBusinessInquiryFormAction}
        unarchiveAction={unarchiveBusinessInquiryFormAction}
        settings={settings}
        plan={businessContext.business.plan}
        billingProps={
          billingOverview
            ? {
                userId: billingOverview.userId,
                businessId: billingOverview.businessId,
                businessSlug: billingOverview.businessSlug,
                currentPlan: billingOverview.currentPlan,
                region: billingOverview.region,
                defaultCurrency: billingOverview.defaultCurrency,
              }
            : undefined
        }
      />
    </>
  );
}
