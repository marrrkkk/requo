import { MessageSquareText } from "lucide-react";

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
        description="Keep reusable reply snippets ready for faster inquiry responses."
        actions={
          <DashboardMetaPill>
            <MessageSquareText className="size-3.5" />
            {replySnippets.length} saved
          </DashboardMetaPill>
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
