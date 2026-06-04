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
import { getBusinessOperationalPageContext } from "@/app/(business)/[businessSlug]/settings/_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Forms",
  description: "Manage inquiry forms for this business.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function BusinessFormsSettingsPage() {
  return (
    <>
      <PageHeader
        title="Forms"
        description="Manage inquiry capture, public URLs, and starting intake defaults."
      />
      <Suspense fallback={<ManagerBodySkeleton />}>
        <FormsContent />
      </Suspense>
    </>
  );
}

async function FormsContent() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const settings = await getBusinessInquiryFormsSettingsForBusiness(
    businessContext.business.id,
  );

  if (!settings) {
    notFound();
  }

  return (
    <BusinessInquiryFormsManager
      createAction={createBusinessInquiryFormAction}
      unarchiveAction={unarchiveBusinessInquiryFormAction}
      settings={settings}
      plan={businessContext.business.plan}
    />
  );
}
