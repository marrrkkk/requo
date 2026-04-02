import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, Globe2, Mail, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { updateWorkspaceSettingsAction } from "@/features/settings/actions";
import { WorkspaceSettingsForm } from "@/features/settings/components/workspace-settings-form";
import { getWorkspaceSettingsForWorkspace } from "@/features/settings/queries";
import {
  formatWorkspaceAiToneLabel,
  getWorkspacePublicInquiryUrl,
} from "@/features/settings/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOwnerWorkspaceContext } from "@/lib/db/workspace-access";

export default async function SettingsPage() {
  const { user, workspaceContext } = await requireOwnerWorkspaceContext();
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
    <div className="flex flex-col gap-6">
      <div className="max-w-3xl flex flex-col gap-2">
        <span className="eyebrow">Settings</span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Keep workspace identity, defaults, and owner preferences tidy.
        </h1>
        <p className="text-sm leading-7 text-muted-foreground sm:text-base">
          This stays intentionally straightforward: update the business profile,
          control the public inquiry surface, and store the defaults your team
          and AI tools should lean on later.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <WorkspaceSettingsForm
          action={updateWorkspaceSettingsAction}
          fallbackContactEmail={user.email}
          logoPreviewUrl={logoPreviewUrl}
          settings={settings}
        />

        <div className="flex flex-col gap-6">
          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>Workspace snapshot</CardTitle>
              <CardDescription>
                Quick reference for the live public link and current defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SnapshotItem
                icon={Globe2}
                label="Public inquiry page"
                value={publicInquiryUrl}
              >
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={publicInquiryUrl}
                  prefetch={false}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open public page
                </Link>
              </SnapshotItem>
              <SnapshotItem
                icon={Mail}
                label="Contact email"
                value={settings.contactEmail ?? user.email}
              />
              <SnapshotItem
                icon={Bot}
                label="AI tone"
                value={formatWorkspaceAiToneLabel(settings.aiTonePreference)}
              />
              <SnapshotItem
                icon={ShieldCheck}
                label="Notifications"
                value={
                  settings.notifyOnNewInquiry || settings.notifyOnQuoteSent
                    ? "Email preferences enabled"
                    : "All notification scaffolding is off"
                }
              />
            </CardContent>
          </Card>

          <Card className="bg-background/75">
            <CardHeader className="gap-2">
              <CardTitle>What these settings affect</CardTitle>
              <CardDescription>
                The current MVP uses these values in a few practical places
                already and keeps the rest ready for later workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm leading-7 text-muted-foreground">
              <div className="rounded-3xl border bg-background/80 px-4 py-3">
                Public slug and inquiry settings control how customers reach the
                intake page.
              </div>
              <div className="rounded-3xl border bg-background/80 px-4 py-3">
                AI tone, default signature, and quote notes become part of the
                internal business context.
              </div>
              <div className="rounded-3xl border bg-background/80 px-4 py-3">
                Notification preferences stay lightweight for now, but they keep
                the owner-first email workflow ready for future expansion.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SnapshotItem({
  children,
  icon: Icon,
  label,
  value,
}: {
  children?: ReactNode;
  icon: typeof Globe2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.45rem] border bg-background/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl border bg-muted/20">
          <Icon className="size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="break-all text-sm font-medium text-foreground">{value}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
