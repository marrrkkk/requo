import { FormInput, LayoutTemplate } from "lucide-react";
import { notFound } from "next/navigation";

import { DashboardMetaPill } from "@/components/shared/dashboard-layout";
import { PageHeader } from "@/components/shared/page-header";
import {
  createReplySnippetAction,
  deleteReplySnippetAction,
  updateReplySnippetAction,
} from "@/features/inquiries/reply-snippet-actions";
import { getReplySnippetsForWorkspace } from "@/features/inquiries/reply-snippet-queries";
import { createWorkspaceInquiryFormAction } from "@/features/settings/actions";
import { WorkspaceInquiryFormsManager } from "@/features/settings/components/workspace-inquiry-forms-manager";
import { WorkspaceReplySnippetsManager } from "@/features/settings/components/workspace-reply-snippets-manager";
import { getWorkspaceInquiryFormsSettingsForWorkspace } from "@/features/settings/queries";
import { getWorkspaceOwnerPageContext } from "../_lib/page-context";

export default async function WorkspaceInquirySettingsPage() {
  const { workspaceContext } = await getWorkspaceOwnerPageContext();
  const [settings, replySnippets] = await Promise.all([
    getWorkspaceInquiryFormsSettingsForWorkspace(workspaceContext.workspace.id),
    getReplySnippetsForWorkspace(workspaceContext.workspace.id),
  ]);

  if (!settings) {
    notFound();
  }

  const activeForms = settings.forms.filter((form) => !form.archivedAt);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Inquiry"
        description="Manage inquiry forms, public URLs, and saved reply snippets."
        actions={
          <>
            <DashboardMetaPill>
              <FormInput className="size-3.5" />
              {activeForms.length} active
            </DashboardMetaPill>
            <DashboardMetaPill>
              <LayoutTemplate className="size-3.5" />
              {settings.forms.length} total
            </DashboardMetaPill>
          </>
        }
      />

      <WorkspaceInquiryFormsManager
        createAction={createWorkspaceInquiryFormAction}
        settings={settings}
      />
      <WorkspaceReplySnippetsManager
        snippets={replySnippets}
        createAction={createReplySnippetAction}
        updateAction={updateReplySnippetAction}
        deleteAction={deleteReplySnippetAction}
      />
    </>
  );
}
