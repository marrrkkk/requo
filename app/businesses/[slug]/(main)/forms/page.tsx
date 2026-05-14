import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { ManagerBodySkeleton } from "@/components/shell/settings-body-skeletons";
import {
  createBusinessInquiryFormAction,
  unarchiveBusinessInquiryFormAction,
} from "@/features/settings/actions";
import { BusinessInquiryFormsManager } from "@/features/settings/components/business-inquiry-forms-manager";
import { getBusinessInquiryFormsSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../settings/_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Forms",
  description: "Manage inquiry forms for this business.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default async function BusinessFormsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settingsPromise = getBusinessInquiryFormsSettingsForBusiness(
    businessContext.business.id,
  );

  return (
    <>
      <PageHeader
        title="Forms"
        description="Manage inquiry capture, public URLs, and starting intake defaults."
      />
      <Suspense fallback={<ManagerBodySkeleton />}>
        <BusinessFormsBody
          businessPlan={businessContext.business.plan}
          settingsPromise={settingsPromise}
        />
      </Suspense>
    </>
  );
}

async function BusinessFormsBody({
  businessPlan,
  settingsPromise,
}: {
  businessPlan: Awaited<ReturnType<typeof getBusinessOperationalPageContext>>["businessContext"]["business"]["plan"];
  settingsPromise: ReturnType<typeof getBusinessInquiryFormsSettingsForBusiness>;
}) {
  const settings = await settingsPromise;

  if (!settings) {
    notFound();
  }

  return (
    <BusinessInquiryFormsManager
      createAction={createBusinessInquiryFormAction}
      unarchiveAction={unarchiveBusinessInquiryFormAction}
      settings={settings}
      plan={businessPlan}
    />
  );
}
