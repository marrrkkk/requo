import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Eye } from "lucide-react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { PublicInquiryPageRenderer } from "@/features/inquiries/components/public-inquiry-page-renderer";
import { getWorkspaceInquiryPageSettingsForWorkspace } from "@/features/settings/queries";
import { getWorkspacePublicInquiryUrl } from "@/features/settings/utils";
import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";
import { getWorkspaceOwnerPageContext } from "../../_lib/page-context";

export default async function WorkspaceInquiryPagePreviewPage() {
  const { workspaceContext } = await getWorkspaceOwnerPageContext();
  const settings = await getWorkspaceInquiryPageSettingsForWorkspace(
    workspaceContext.workspace.id,
  );

  if (!settings) {
    notFound();
  }

  const workspace = {
    id: settings.id,
    name: settings.name,
    slug: settings.slug,
    shortDescription: settings.shortDescription,
    logoUrl: settings.logoStoragePath
      ? `/api/workspace/logo?v=${settings.updatedAt.getTime()}`
      : null,
    inquiryPageConfig: settings.inquiryPageConfig,
  };
  const settingsHref = getWorkspaceSettingsPath(settings.slug, "inquiry-page");
  const publicInquiryHref = getWorkspacePublicInquiryUrl(settings.slug);
  const submitPublicInquiry = submitPublicInquiryAction.bind(null, settings.slug);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Inquiry page preview"
        description="This page shows the last saved version of the public inquiry page. Save changes in the editor first if you want to preview the latest edits."
      />

      <PublicInquiryPageRenderer
        workspace={workspace}
        action={submitPublicInquiry}
        previewMode
        headerAction={
          <>
            <Button asChild variant="outline">
              <Link href={settingsHref} prefetch={false}>
                <ArrowLeft data-icon="inline-start" />
                Back to editor
              </Link>
            </Button>
            {settings.publicInquiryEnabled ? (
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
          </>
        }
        beforeHero={
          <div className="toolbar-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 size-4 text-primary" />
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Preview mode keeps the form visible but disables submission on
                  this page so you can review the saved layout without creating
                  a test inquiry.
                </p>
              </div>
            </div>
          </div>
        }
      />
    </>
  );
}
