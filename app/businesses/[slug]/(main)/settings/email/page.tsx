import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { updateBusinessEmailTemplateSettingsAction } from "@/features/settings/actions";
import { BusinessEmailTemplateForm } from "@/features/settings/components/business-email-template-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = {
  title: "Email",
};

export default async function BusinessEmailTemplateSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();

  if (!hasFeatureAccess(businessContext.business.plan, "emailTemplates")) {
    const billingOverview = await getBusinessBillingOverview(
      businessContext.business.id,
    );

    return (
      <>
        <PageHeader
          eyebrow="Quotes"
          title="Email templates"
          description="Customize the automated email sent with your quotes."
        />
        <LockedFeaturePage
          feature="emailTemplates"
          plan={businessContext.business.plan}
          description="Upgrade to customize the email message used when sending quotes through Requo."
          upgradeAction={
            billingOverview
              ? {
                  userId: billingOverview.userId,
                  businessId: billingOverview.businessId,
                  businessSlug: billingOverview.businessSlug,
                  currentPlan: billingOverview.currentPlan,
                  region: billingOverview.region,
                  defaultCurrency: billingOverview.defaultCurrency,
                  ctaLabel: "Upgrade for email templates",
                }
              : undefined
          }
        />
      </>
    );
  }

  const settings = await getBusinessSettingsForBusiness(
    businessContext.business.id,
  );

  if (!settings) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Email templates"
        description="Customize the automated email sent with your quotes."
      />

      <BusinessEmailTemplateForm
        action={updateBusinessEmailTemplateSettingsAction}
        key={`business-email-template-settings-${settings.updatedAt.getTime()}`}
        settings={settings}
      />
    </>
  );
}
