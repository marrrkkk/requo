"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getValidationActionState } from "@/lib/action-state";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import {
  accountProfileSchema,
  normalizeOptionalTextValue,
} from "@/features/account/schemas";
import type { AccountProfileActionState } from "@/features/account/types";

const initialState: AccountProfileActionState = {};

export async function updateAccountProfileAction(
  prevState: AccountProfileActionState = initialState,
  formData: FormData,
): Promise<AccountProfileActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = accountProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    phone: formData.get("phone"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted profile details and try again.",
    );
  }

  const now = new Date();

  try {
    await auth.api.updateUser({
      body: {
        name: validationResult.data.fullName,
      },
      headers: await headers(),
    });

    await ensureProfileForUser({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    await db
      .update(profiles)
      .set({
        fullName: validationResult.data.fullName,
        jobTitle: validationResult.data.jobTitle,
        phone: normalizeOptionalTextValue(validationResult.data.phone),
        updatedAt: now,
      })
      .where(eq(profiles.userId, user.id));

    return {
      success: "Profile saved.",
    };
  } catch (error) {
    console.error("Failed to update account profile.", error);

    return {
      error: "We couldn't save your profile right now.",
    };
  }
}
