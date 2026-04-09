import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { createBusinessInquiryFormAction } from "@/features/settings/actions";
import { BusinessInquiryFormsManager } from "@/features/settings/components/business-inquiry-forms-manager";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { getBusinessOwnerPageContext } from "../settings/_lib/page-context";

export default async function BusinessFormsPage() {
  const { businessContext } = await getBusinessOwnerPageContext();
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
        description="Manage inquiry forms, public URLs, and live intake defaults."
      />

      <BusinessInquiryFormsManager
        createAction={createBusinessInquiryFormAction}
        settings={settings}
      />
    </>
  );
}
