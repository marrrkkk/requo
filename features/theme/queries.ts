import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import type { ThemePreference } from "@/features/theme/types";
import {
  getUserThemeCacheTags,
  userShellCacheLife,
} from "@/lib/cache/shell-tags";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export async function getThemePreferenceForUser(
  userId: string,
): Promise<ThemePreference> {
  "use cache";

  cacheLife(userShellCacheLife);
  cacheTag(...getUserThemeCacheTags(userId));

  try {
    const [profile] = await db
      .select({
        themePreference: profiles.themePreference,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    return profile?.themePreference ?? "system";
  } catch (error) {
    if (isMissingThemePreferenceColumnError(error)) {
      console.warn(
        "profiles.theme_preference is missing. Falling back to system theme.",
      );

      return "system";
    }

    throw error;
  }
}

function isMissingThemePreferenceColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42703"
  );
}
