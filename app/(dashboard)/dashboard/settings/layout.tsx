import type { ReactNode } from "react";

import { DashboardPage } from "@/components/shared/dashboard-layout";
import { WorkspaceSectionNav } from "@/features/settings/components/workspace-section-nav";
import { getWorkspaceOwnerPageContext } from "./_lib/page-context";

type WorkspaceSettingsLayoutProps = {
  children: ReactNode;
};

export default async function WorkspaceSettingsLayout({
  children,
}: WorkspaceSettingsLayoutProps) {
  await getWorkspaceOwnerPageContext();

  return (
    <DashboardPage>
      <WorkspaceSectionNav />
      {children}
    </DashboardPage>
  );
}
