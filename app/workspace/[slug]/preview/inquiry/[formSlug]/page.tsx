import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Eye } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import { getInquiryWorkspacePreviewByFormSlug } from "@/features/inquiries/queries";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import { requireSession } from "@/lib/auth/session";
import { getWorkspaceContextForMembershipSlug } from "@/lib/db/workspace-access";
import {
  getWorkspaceDashboardPath,
  getWorkspaceInquiryPageEditorPath,
  workspaceHubPath,
} from "@/features/workspaces/routes";

export default async function WorkspaceInquiryFormPreviewPage({
  params,
}: {
  params: Promise<{ slug: string; formSlug: string }>;
}) {
  const [session, { slug, formSlug }] = await Promise.all([
    requireSession(),
    params,
  ]);
  const [workspaceContext, workspace] = await Promise.all([
    getWorkspaceContextForMembershipSlug(session.user.id, slug),
    getInquiryWorkspacePreviewByFormSlug({
      workspaceSlug: slug,
      formSlug,
    }),
  ]);

  if (!workspaceContext) {
    redirect(workspaceHubPath);
  }

  if (workspaceContext.role !== "owner") {
    redirect(getWorkspaceDashboardPath(workspaceContext.workspace.slug));
  }

  if (!workspace) {
    notFound();
  }

  const settingsHref = getWorkspaceInquiryPageEditorPath(slug, formSlug);
  const publicInquiryHref = workspace.form.isDefault
    ? getWorkspacePublicInquiryUrl(workspace.slug)
    : getWorkspacePublicInquiryUrl(workspace.slug, workspace.form.slug);
  const submitPublicInquiry = submitPublicInquiryAction.bind(
    null,
    workspace.slug,
    workspace.form.slug,
  );

  return (
    <PublicInquiryPageRenderer
      workspace={workspace}
      action={submitPublicInquiry}
      previewMode
      beforeHero={
        <div className="rounded-none border-b border-primary/20 bg-primary/5 px-4 py-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Eye className="size-4" />
              Preview only
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:[&>*]:w-auto [&>*]:w-full">
              <Button asChild variant="outline">
                <Link href={settingsHref} prefetch={true}>
                  <ArrowLeft data-icon="inline-start" />
                  Back to editor
                </Link>
              </Button>
              {workspace.form.publicInquiryEnabled ? (
                <Button asChild variant="ghost">
                  <Link
                    href={publicInquiryHref}
                    prefetch={false}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ArrowUpRight data-icon="inline-start" />
                    Open live page
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      }
    />
  );
}
