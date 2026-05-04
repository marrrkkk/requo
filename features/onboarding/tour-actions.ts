"use server";

import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export async function completeDashboardTourAction() {
  const user = await requireUser();

  await db
    .update(profiles)
    .set({
      dashboardTourCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, user.id));
}

export async function completeFormEditorTourAction() {
  const user = await requireUser();

  await db
    .update(profiles)
    .set({
      formEditorTourCompletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, user.id));
}
