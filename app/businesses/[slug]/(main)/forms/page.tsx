import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  createBusinessInquiryFormAction,
  unarchiveBusinessInquiryFormAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormsManager } from "@/features/settings/components/business-inquiry-forms-manager";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { getWorkspaceBillingOverview } from "@/features/billing/queries";
import { getBusinessOperationalPageContext } from "../settings/_lib/page-context";

export default async function BusinessFormsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const [settings, billingOverview] = await Promise.all([
    getBusinessInquiryFormsSettingsForBusiness(businessContext.business.id),
    getWorkspaceBillingOverview(businessContext.business.workspaceId),
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
        workspacePlan={businessContext.business.workspacePlan}
        billingProps={
          billingOverview
            ? {
                workspaceId: billingOverview.workspaceId,
                workspaceSlug: billingOverview.workspaceSlug,
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
