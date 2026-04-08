import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  createReplySnippetAction,
  deleteReplySnippetAction,
  updateReplySnippetAction,
} from "@/features/inquiries/reply-snippet-actions";
import { getReplySnippetsForBusiness } from "@/features/inquiries/reply-snippet-queries";
import { BusinessReplySnippetsManager } from "@/features/settings/components/business-reply-snippets-manager";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessSavedRepliesPage() {
  const { businessContext } = await getBusinessOwnerPageContext();
  const replySnippets = await getReplySnippetsForBusiness(
    businessContext.business.id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Responses"
        title="Saved replies"
        description="Reusable replies for faster drafting."
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
