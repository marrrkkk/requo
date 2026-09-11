"use server";

import { eq } from "drizzle-orm";

import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import {
  isUiScale,
  type UiScale,
} from "@/features/theme/ui-scale-types";
import { revalidateUiScalePreferenceForUser } from "@/features/theme/ui-scale-queries";

type UpdateUiScalePreferenceResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function updateUiScalePreferenceAction(
  nextScale: UiScale,
): Promise<UpdateUiScalePreferenceResult> {
  if (!isUiScale(nextScale)) {
    return {
      ok: false,
      error: "Choose a valid interface scale.",
    };
  }

  const user = await requireUser();

  await ensureProfileForUser({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  try {
    await db
      .update(profiles)
      .set({
        uiScale: nextScale,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    revalidateUiScalePreferenceForUser(user.id);

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to update interface scale preference.", error);

    return {
      ok: false,
      error: "We couldn't save your interface scale right now.",
    };
  }
}
