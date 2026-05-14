import type { Metadata } from "next";
import { FormInput } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { DashboardEmptyState, DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { ManagerBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { Button } from "@/components/ui/button";
import { createManualInquiryAction } from "@/features/inquiries/actions";
import { ManualInquiryEditor } from "@/features/inquiries/components/manual-inquiry-editor";
import { getPublicInquiryAttachmentHelpText } from "@/features/inquiries/plan-rules";
import { getInquiryEditorFormsForBusiness } from "@/features/inquiries/queries";
import { getBusinessFormsPath } from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

type NewInquiryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createNoIndexMetadata({
  title: "New inquiry",
  description: "Quick-add an inquiry captured outside of a public form.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default async function NewInquiryPage({
  params,
  searchParams,
}: NewInquiryPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { businessContext } = await getAppShellContext(slug);
  const inquiryFormsPromise = getInquiryEditorFormsForBusiness(
    businessContext.business.id,
  );

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="New inquiry"
        title="Quick-add inquiry"
        description="Capture the essentials from a call, chat, walk-in, or forwarded message. You can add deeper form details later."
      />
      <Suspense fallback={<ManagerBodySkeleton />}>
        <NewInquiryEditorBody
          businessName={businessContext.business.name}
          businessSlug={businessContext.business.slug}
          businessPlan={businessContext.business.plan}
          inquiryFormsPromise={inquiryFormsPromise}
          searchParams={resolvedSearchParams}
        />
      </Suspense>
    </DashboardPage>
  );
}

async function NewInquiryEditorBody({
  businessName,
  businessSlug,
  businessPlan,
  inquiryFormsPromise,
  searchParams,
}: {
  businessName: string;
  businessSlug: string;
  businessPlan: Awaited<ReturnType<typeof getAppShellContext>>["businessContext"]["business"]["plan"];
  inquiryFormsPromise: ReturnType<typeof getInquiryEditorFormsForBusiness>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const inquiryForms = await inquiryFormsPromise;
  const requestedFormSlug = Array.isArray(searchParams.form)
    ? searchParams.form[0]
    : searchParams.form;
  const initialFormSlug =
    (requestedFormSlug &&
      inquiryForms.find((form) => form.slug === requestedFormSlug)?.slug) ??
    inquiryForms[0]?.slug;
  const uploadHelpText = getPublicInquiryAttachmentHelpText(businessPlan);

  if (!initialFormSlug) {
    return (
      <DashboardEmptyState
        action={
          <Button asChild>
            <Link href={getBusinessFormsPath(businessSlug)} prefetch={true}>
              Open forms
            </Link>
          </Button>
        }
        description="Create or restore an active inquiry form first, then come back here to add inquiries manually."
        icon={FormInput}
        title="No active inquiry forms"
        variant="page"
      />
    );
  }

  return (
    <ManualInquiryEditor
      action={createManualInquiryAction}
      businessName={businessName}
      forms={inquiryForms}
      initialFormSlug={initialFormSlug}
      uploadHelpText={uploadHelpText}
    />
  );
}
