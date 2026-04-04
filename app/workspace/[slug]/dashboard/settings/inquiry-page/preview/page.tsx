import { redirect } from "next/navigation";

import { getDefaultWorkspaceInquiryFormForWorkspace } from "@/features/settings/queries";
import { getWorkspaceInquiryFormPreviewPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceContextForMembershipSlug } from "@/lib/db/workspace-access";

export default async function WorkspaceDashboardInquiryPagePreviewRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const workspaceContext = await getWorkspaceContextForMembershipSlug(
    session.user.id,
    slug,
  );
  const form = workspaceContext
    ? await getDefaultWorkspaceInquiryFormForWorkspace(workspaceContext.workspace.id)
    : null;

  redirect(getWorkspaceInquiryFormPreviewPath(slug, form?.slug ?? "main"));
}
