"use server";

import { eq } from "drizzle-orm";

import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { revalidateThemePreferenceForUser } from "@/features/theme/queries";
import {
  isThemePreference,
  type ThemePreference,
} from "@/features/theme/types";

type UpdateThemePreferenceResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function updateThemePreferenceAction(
  nextTheme: ThemePreference,
): Promise<UpdateThemePreferenceResult> {
  if (!isThemePreference(nextTheme)) {
    return {
      ok: false,
      error: "Choose a valid appearance option.",
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
        themePreference: nextTheme,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    revalidateThemePreferenceForUser(user.id);

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to update theme preference.", error);

    return {
      ok: false,
      error: "We couldn't save your appearance preference right now.",
    };
  }
}
