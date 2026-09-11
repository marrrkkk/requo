import "server-only";

import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { revalidateTag } from "next/cache";
import { cache } from "react";

import type { UiScale } from "@/features/theme/ui-scale-types";
import { defaultUiScale } from "@/features/theme/ui-scale-types";
import {
  getUserUiScaleCacheTags,
  userShellCacheLife,
} from "@/lib/cache/shell-tags";
import { withCircuitBreaker } from "@/lib/db/circuit-breaker";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

async function getCachedUiScalePreference(
  userId: string,
): Promise<UiScale> {
  "use cache";

  cacheLife(userShellCacheLife);
  cacheTag(...getUserUiScaleCacheTags(userId));

  try {
    const [profile] = await withCircuitBreaker(
      `shell:ui-scale:${userId}`,
      () =>
        db
          .select({
            uiScale: profiles.uiScale,
          })
          .from(profiles)
          .where(eq(profiles.userId, userId))
          .limit(1),
    );

    return profile?.uiScale ?? defaultUiScale;
  } catch (error) {
    if (isMissingUiScaleColumnError(error)) {
      console.warn(
        "profiles.ui_scale is missing. Falling back to default interface scale.",
      );

      return defaultUiScale;
    }

    throw error;
  }
}

/**
 * Request-deduped interface scale lookup. Wraps the `"use cache"`-backed
 * inner function in `React.cache` so multiple components within the same
 * render (shell + page) share a single resolution.
 */
export const getUiScalePreferenceForUser = cache(
  async (userId: string): Promise<UiScale> => {
    return getCachedUiScalePreference(userId);
  },
);

export function revalidateUiScalePreferenceForUser(userId: string) {
  for (const tag of getUserUiScaleCacheTags(userId)) {
    revalidateTag(tag, "max");
  }
}

function isMissingUiScaleColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42703"
  );
}
