import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  createBusinessInquiryFormAction,
  unarchiveBusinessInquiryFormAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormsManager } from "@/features/settings/components/business-inquiry-forms-manager";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessOperationalPageContext } from "../settings/_lib/page-context";

export default async function BusinessFormsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settings = await getBusinessInquiryFormsSettingsForBusiness(
    businessContext.business.id,
  );

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
      />
    </>
  );
}
