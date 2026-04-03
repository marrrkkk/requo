import Link from "next/link";
import { Bot, Globe2, Mail, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  DashboardDetailLayout,
  DashboardPage,
  DashboardSection,
  DashboardSidebarStack,
} from "@/components/shared/dashboard-layout";
import { InfoTile } from "@/components/shared/info-tile";
import { PageHeader } from "@/components/shared/page-header";
import { updateWorkspaceSettingsAction } from "@/features/settings/actions";
import { WorkspaceSettingsForm } from "@/features/settings/components/workspace-settings-form";
import { getWorkspaceSettingsForWorkspace } from "@/features/settings/queries";
import {
  formatWorkspaceAiToneLabel,
  getWorkspacePublicInquiryUrl,
} from "@/features/settings/utils";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export default async function SettingsPage() {
  const { user, workspaceContext } = await requireCurrentWorkspaceContext();

  if (workspaceContext.role !== "owner") {
    redirect("/dashboard");
  }

  const settings = await getWorkspaceSettingsForWorkspace(
    workspaceContext.workspace.id,
  );

  if (!settings) {
    notFound();
  }

  const publicInquiryUrl = getWorkspacePublicInquiryUrl(settings.slug);
  const logoPreviewUrl = settings.logoStoragePath
    ? `/api/workspace/logo?v=${settings.updatedAt.getTime()}`
    : null;

  return (
    <DashboardPage>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Update identity, intake defaults, and preferences."
      />

      <DashboardDetailLayout className="xl:grid-cols-[1.12fr_0.88fr]">
        <WorkspaceSettingsForm
          action={updateWorkspaceSettingsAction}
          fallbackContactEmail={user.email}
          logoPreviewUrl={logoPreviewUrl}
          settings={settings}
        />

        <DashboardSidebarStack className="xl:sticky xl:top-[5.5rem] xl:self-start">
          <DashboardSection
            contentClassName="flex flex-col gap-4"
            description="Current live details."
            title="Workspace snapshot"
          >
              <InfoTile
                icon={Globe2}
                label="Public inquiry page"
                value={publicInquiryUrl}
                description={
                  <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={publicInquiryUrl}
                    prefetch={false}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open public page
                  </Link>
                }
                valueClassName="break-all"
              />
              <InfoTile
                icon={Mail}
                label="Contact email"
                value={settings.contactEmail ?? user.email}
              />
              <InfoTile
                icon={Bot}
                label="AI tone"
                value={formatWorkspaceAiToneLabel(settings.aiTonePreference)}
              />
              <InfoTile
                icon={ShieldCheck}
                label="Notifications"
                value={
                  settings.notifyOnNewInquiry || settings.notifyOnQuoteSent
                    ? "Email preferences enabled"
                    : "All notification scaffolding is off"
                }
              />
          </DashboardSection>

          <DashboardSection
            contentClassName="flex flex-col gap-4 text-sm leading-7 text-muted-foreground"
            description="Where the current values show up."
            title="What these settings affect"
          >
              <div className="soft-panel px-4 py-3">
                Public slug and intake settings shape the customer form.
              </div>
              <div className="soft-panel px-4 py-3">
                AI tone, signature, and quote notes feed internal drafting.
              </div>
              <div className="soft-panel px-4 py-3">
                Notification preferences stay lightweight for the MVP.
              </div>
          </DashboardSection>
        </DashboardSidebarStack>
      </DashboardDetailLayout>
    </DashboardPage>
  );
}
