import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { requireCurrentWorkspaceContext } from "@/lib/db/workspace-access";

export const getWorkspaceOwnerPageContext = cache(async () => {
  const context = await requireCurrentWorkspaceContext();

  if (context.workspaceContext.role !== "owner") {
    redirect("/dashboard");
  }

  return context;
});
