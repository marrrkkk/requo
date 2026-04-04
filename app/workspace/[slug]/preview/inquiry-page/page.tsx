import { redirect } from "next/navigation";

import { getDefaultWorkspaceInquiryFormForWorkspace } from "@/features/settings/queries";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceContextForMembershipSlug } from "@/lib/db/workspace-access";
import {
  getWorkspaceDashboardPath,
  getWorkspaceInquiryFormPreviewPath,
  workspaceHubPath,
} from "@/features/workspaces/routes";

export default async function WorkspaceInquiryPagePreviewRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const workspaceContext = await getWorkspaceContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!workspaceContext) {
    redirect(workspaceHubPath);
  }

  if (workspaceContext.role !== "owner") {
    redirect(getWorkspaceDashboardPath(workspaceContext.workspace.slug));
  }

  const form = await getDefaultWorkspaceInquiryFormForWorkspace(
    workspaceContext.workspace.id,
  );

  redirect(getWorkspaceInquiryFormPreviewPath(slug, form?.slug ?? "main"));
}
