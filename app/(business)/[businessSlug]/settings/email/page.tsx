import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { FeatureGate } from "@/features/paywall";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { updateBusinessEmailTemplateSettingsAction } from "@/features/settings/actions";
import { BusinessEmailTemplateForm } from "@/features/settings/components/business-email-template-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Email",
  description: "Edit the email templates Requo sends on behalf of this business.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessEmailTemplateSettingsPage() {
  const { user, businessContext } = await getBusinessOperationalPageContext();

  const billingOverview = await getBusinessBillingOverview(
    businessContext.business.id,
  ).catch(() => null);

  return (
    <FeatureGate
      feature="emailTemplates"
      plan={businessContext.business.plan}
      variant="page"
      upgradeAction={
        billingOverview
          ? {
              userId: user.id,
              businessId: businessContext.business.id,
              businessSlug: businessContext.business.slug,
              currentPlan: billingOverview.currentPlan,
            }
          : undefined
      }
    >
      <PageHeader
        eyebrow="Quotes"
        title="Email templates"
        description="Customize the automated email sent with your quotes."
      />

      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <BusinessEmailTemplateSettingsBody
          businessId={businessContext.business.id}
        />
      </Suspense>
    </FeatureGate>
  );
}

async function BusinessEmailTemplateSettingsBody({
  businessId,
}: {
  businessId: string;
}) {
  const settings = await getBusinessSettingsForBusiness(businessId);

  if (!settings) {
    notFound();
  }

  return (
    <BusinessEmailTemplateForm
      action={updateBusinessEmailTemplateSettingsAction}
      key={`business-email-template-settings-${settings.updatedAt.getTime()}`}
      settings={settings}
    />
  );
}
