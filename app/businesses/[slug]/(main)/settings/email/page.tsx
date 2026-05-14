import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { updateBusinessEmailTemplateSettingsAction } from "@/features/settings/actions";
import { BusinessEmailTemplateForm } from "@/features/settings/components/business-email-template-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Email",
  description: "Edit the email templates Requo sends on behalf of this business.",
});

export const unstable_instant = { prefetch: "static", unstable_disableValidation: true };

export default async function BusinessEmailTemplateSettingsPage() {
  const { businessContext } = await getBusinessOperationalPageContext();
  const hasAccess = hasFeatureAccess(
    businessContext.business.plan,
    "emailTemplates",
  );

  // Kick off both fetches as soon as we know what we need; each streams
  // into its own Suspense boundary so the page frame renders immediately.
  const billingPromise = hasAccess
    ? null
    : getBusinessBillingOverview(businessContext.business.id);
  const settingsPromise = hasAccess
    ? getBusinessSettingsForBusiness(businessContext.business.id)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Quotes"
        title="Email templates"
        description="Customize the automated email sent with your quotes."
      />

      {hasAccess && settingsPromise ? (
        <Suspense fallback={<SettingsFormBodySkeleton />}>
          <BusinessEmailTemplateSettingsBody settingsPromise={settingsPromise} />
        </Suspense>
      ) : billingPromise ? (
        <Suspense fallback={<SettingsFormBodySkeleton />}>
          <LockedEmailTemplatesBody
            plan={businessContext.business.plan}
            billingPromise={billingPromise}
          />
        </Suspense>
      ) : null}
    </>
  );
}

async function BusinessEmailTemplateSettingsBody({
  settingsPromise,
}: {
  settingsPromise: ReturnType<typeof getBusinessSettingsForBusiness>;
}) {
  const settings = await settingsPromise;

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

async function LockedEmailTemplatesBody({
  plan,
  billingPromise,
}: {
  plan: Awaited<ReturnType<typeof getBusinessOperationalPageContext>>["businessContext"]["business"]["plan"];
  billingPromise: ReturnType<typeof getBusinessBillingOverview>;
}) {
  const billingOverview = await billingPromise;

  return (
    <LockedFeaturePage
      feature="emailTemplates"
      plan={plan}
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
  );
}
