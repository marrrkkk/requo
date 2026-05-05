import { redirect } from "next/navigation";
import { getWorkspaceSettingsPath } from "@/features/workspaces/routes";

type WorkspaceSettingsIndexPageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceSettingsIndexPage({
  params,
}: WorkspaceSettingsIndexPageProps) {
  const { workspaceSlug } = await params;
  
  redirect(getWorkspaceSettingsPath(workspaceSlug, "general"));
}
