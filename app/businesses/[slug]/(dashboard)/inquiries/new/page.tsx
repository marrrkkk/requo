import { FormInput } from "lucide-react";
import { redirect } from "next/navigation";

import { DashboardEmptyState, DashboardPage } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { createManualInquiryAction } from "@/features/inquiries/actions";
import { ManualInquiryEditor } from "@/features/inquiries/components/manual-inquiry-editor";
import { getInquiryEditorFormsForBusiness } from "@/features/inquiries/queries";
import {
  getBusinessFormsPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";
import Link from "next/link";

type NewInquiryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewInquiryPage({
  params,
  searchParams,
}: NewInquiryPageProps) {
  const [session, { slug }, resolvedSearchParams] = await Promise.all([
    requireSession(),
    params,
    searchParams,
  ]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  const inquiryForms = await getInquiryEditorFormsForBusiness(
    businessContext.business.id,
  );
  const requestedFormSlug = Array.isArray(resolvedSearchParams.form)
    ? resolvedSearchParams.form[0]
    : resolvedSearchParams.form;
  const initialFormSlug =
    (requestedFormSlug &&
      inquiryForms.find((form) => form.slug === requestedFormSlug)?.slug) ??
    inquiryForms[0]?.slug;

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="New inquiry"
        title="Quick-add inquiry"
        description="Capture the essentials from a call, chat, walk-in, or forwarded message. You can add deeper form details later."
      />

      {initialFormSlug ? (
        <ManualInquiryEditor
          action={createManualInquiryAction}
          businessName={businessContext.business.name}
          forms={inquiryForms}
          initialFormSlug={initialFormSlug}
        />
      ) : (
        <DashboardEmptyState
          action={
            <Button asChild>
              <Link href={getBusinessFormsPath(businessContext.business.slug)} prefetch={true}>
                Open forms
              </Link>
            </Button>
          }
          description="Create or restore an active inquiry form first, then come back here to add inquiries manually."
          icon={FormInput}
          title="No active inquiry forms"
          variant="page"
        />
      )}
    </DashboardPage>
  );
}
