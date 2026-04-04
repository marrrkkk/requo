import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { workspaceHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import {
  getWorkspaceContextForMembershipSlug,
  getWorkspaceMembershipsForUser,
} from "@/lib/db/workspace-access";

type WorkspaceDashboardLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>;

export default async function WorkspaceDashboardLayout({
  children,
  params,
}: WorkspaceDashboardLayoutProps) {
  const session = await requireSession();
  const { slug } = await params;
  const [workspaceContext, workspaceMemberships] = await Promise.all([
    getWorkspaceContextForMembershipSlug(session.user.id, slug),
    getWorkspaceMembershipsForUser(session.user.id),
  ]);

  if (!workspaceContext) {
    redirect(workspaceHubPath);
  }

  return (
    <DashboardShell
      user={session.user}
      workspaceContext={workspaceContext}
      workspaceMemberships={workspaceMemberships}
    >
      {children}
    </DashboardShell>
  );
}
