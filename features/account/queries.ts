import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import type { AccountProfileRecord } from "@/features/account/types";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export const getAccountProfileForUser = cache(async (
  userId: string,
): Promise<AccountProfileRecord | null> => {
  const [profile] = await db
    .select({
      fullName: profiles.fullName,
      jobTitle: profiles.jobTitle,
      phone: profiles.phone,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile ?? null;
});
