import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getWorkspaceDashboardPath } from "@/features/workspaces/routes";
import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export const getWorkspaceOwnerPageContext = cache(async () => {
  const context = await requireCurrentWorkspaceContext();

  if (context.workspaceContext.role !== "owner") {
    redirect(getWorkspaceDashboardPath(context.workspaceContext.workspace.slug));
  }

  return context;
});
