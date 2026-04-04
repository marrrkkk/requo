import { redirect } from "next/navigation";

import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export default async function KnowledgePage() {
  const { workspaceContext } = await requireCurrentWorkspaceContext();

  redirect(getWorkspaceSettingsPath(workspaceContext.workspace.slug, "knowledge"));
}
