import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import {
  createBusinessInquiryFormAction,
  unarchiveBusinessInquiryFormAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormsManager } from "@/features/settings/components/business-inquiry-forms-manager";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { timed } from "@/lib/dev/server-timing";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../settings/_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Forms",
  description: "Manage inquiry forms for this business.",
});

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function BusinessFormsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settings = await timed(
    "formsPage.settings",
    getBusinessInquiryFormsSettingsForBusiness(businessContext.business.id),
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
        plan={businessContext.business.plan}
      />
    </>
  );
}
