import { redirect } from "next/navigation";

import {
  getDefaultWorkspaceSettingsSection,
} from "@/features/workspaces/navigation";
import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";

export default async function WorkspaceSettingsIndexPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  redirect(
    getWorkspaceSettingsPath(
      workspaceSlug,
      getDefaultWorkspaceSettingsSection(),
    ),
  );
}
