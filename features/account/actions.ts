"use server";

import { headers } from "next/headers";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";
import {
  accountProfileSchema,
  normalizeOptionalTextValue,
} from "@/features/account/schemas";
import { updateAccountProfile } from "@/features/account/mutations";
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
    avatar: formData.get("avatar"),
    removeAvatar: formData.get("removeAvatar"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted profile details and try again.",
    );
  }

  try {
    await auth.api.updateUser({
      body: {
        name: validationResult.data.fullName,
      },
      headers: await headers(),
    });

    await updateAccountProfile({
      user: {
        id: user.id,
        email: user.email,
      },
      values: {
        ...validationResult.data,
        phone: normalizeOptionalTextValue(validationResult.data.phone),
      },
    });

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
