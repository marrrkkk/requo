import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import { LockedFeaturePage } from "@/components/shared/paywall";
import {
  createReplySnippetAction,
  deleteReplySnippetAction,
  updateReplySnippetAction,
} from "@/features/inquiries/reply-snippet-actions";
import { getReplySnippetsForBusiness } from "@/features/inquiries/reply-snippet-queries";
import { BusinessReplySnippetsManager } from "@/features/settings/components/business-reply-snippets-manager";
import { getBusinessBillingOverview } from "@/features/billing/queries";
import { hasFeatureAccess } from "@/lib/plans";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export default async function BusinessSavedRepliesPage() {
  const { businessContext } = await getBusinessOperationalPageContext();

  if (!hasFeatureAccess(businessContext.business.plan, "replySnippets")) {
    const billingOverview = await getBusinessBillingOverview(
      businessContext.business.id,
    );

    return (
      <>
        <PageHeader
          eyebrow="Responses"
          title="Saved follow-up replies"
          description="Reusable reply snippets for faster lead follow-up."
        />
        <LockedFeaturePage
          feature="replySnippets"
          plan={businessContext.business.plan}
          description="Upgrade to save reusable follow-up messages and respond faster."
          upgradeAction={
            billingOverview
              ? {
                  userId: billingOverview.userId,
                  businessId: billingOverview.businessId,
                  businessSlug: billingOverview.businessSlug,
                  currentPlan: billingOverview.currentPlan,
                  region: billingOverview.region,
                  defaultCurrency: billingOverview.defaultCurrency,
                  ctaLabel: "Upgrade for saved replies",
                }
              : undefined
          }
        />
      </>
    );
  }

  const replySnippets = await getReplySnippetsForBusiness(
    businessContext.business.id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Responses"
        title="Saved follow-up replies"
        description="Reusable reply snippets for faster lead follow-up."
        actions={
          replySnippets.length ? (
            <DashboardMetaPill>{replySnippets.length} saved</DashboardMetaPill>
          ) : undefined
        }
      />

      <BusinessReplySnippetsManager
        snippets={replySnippets}
        createAction={createReplySnippetAction}
        updateAction={updateReplySnippetAction}
        deleteAction={deleteReplySnippetAction}
      />
    </>
  );
}
