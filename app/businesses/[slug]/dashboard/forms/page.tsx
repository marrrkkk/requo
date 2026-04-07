import { FormInput, LayoutTemplate } from "lucide-react";
import { notFound } from "next/navigation";

import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
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

  const activeForms = settings.forms.filter((form) => !form.archivedAt);

  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title="Forms"
        description="Manage inquiry forms, public URLs, and live intake defaults."
        actions={
          <>
            <DashboardMetaPill>
              <FormInput className="size-3.5" />
              {activeForms.length} active
            </DashboardMetaPill>
            <DashboardMetaPill>
              <LayoutTemplate className="size-3.5" />
              {settings.forms.length} total
            </DashboardMetaPill>
          </>
        }
      />

      <BusinessInquiryFormsManager
        createAction={createBusinessInquiryFormAction}
        settings={settings}
      />
    </>
  );
}
