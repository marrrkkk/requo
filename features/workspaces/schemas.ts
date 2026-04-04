import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a workspace name.")
    .max(80, "Use 80 characters or fewer."),
});
