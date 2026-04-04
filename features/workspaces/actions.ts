"use server";

import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { createWorkspaceSchema } from "@/features/workspaces/schemas";
import { createWorkspaceForUser } from "@/features/workspaces/mutations";
import { getWorkspaceDashboardPath } from "@/features/workspaces/routes";
import type { CreateWorkspaceActionState } from "@/features/workspaces/types";

const initialState: CreateWorkspaceActionState = {};

export async function createWorkspaceAction(
  prevState: CreateWorkspaceActionState = initialState,
  formData: FormData,
): Promise<CreateWorkspaceActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the workspace name and try again.",
    );
  }

  try {
    const workspace = await createWorkspaceForUser({
      user,
      name: validationResult.data.name,
    });

    redirect(getWorkspaceDashboardPath(workspace.slug));
  } catch (error) {
    console.error("Failed to create workspace.", error);

    return {
      error: "We couldn't create that workspace right now.",
    };
  }
}
