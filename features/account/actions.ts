"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getValidationActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";
import {
  accountChangePasswordSchema,
  accountDeleteSchema,
  accountProfileSchema,
  accountSetPasswordSchema,
  normalizeOptionalTextValue,
} from "@/features/account/schemas";
import { updateAccountProfile } from "@/features/account/mutations";
import type {
  AccountDeleteActionState,
  AccountPasswordActionState,
  AccountProfileActionState,
  AccountSessionActionState,
} from "@/features/account/types";
import { getAccountSecurityForUser } from "@/features/account/queries";
import { activeBusinessSlugCookieName } from "@/features/businesses/routes";

const initialProfileState: AccountProfileActionState = {};
const initialPasswordState: AccountPasswordActionState = {};
const initialSessionState: AccountSessionActionState = {};
const initialDeleteState: AccountDeleteActionState = {};

function getAccountSecurityErrorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallback;
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid password")) {
    return "Enter your current password and try again.";
  }

  if (normalizedMessage.includes("credential account not found")) {
    return "Password sign-in is not enabled for this account yet.";
  }

  if (normalizedMessage.includes("password already set")) {
    return "This account already has a password. Use the change password form instead.";
  }

  if (normalizedMessage.includes("session expired")) {
    return "Sign in again and retry this security action.";
  }

  if (normalizedMessage.includes("password is too short")) {
    return "Use at least 8 characters for the new password.";
  }

  if (normalizedMessage.includes("password is too long")) {
    return "Use 128 characters or fewer for the new password.";
  }

  return message;
}

export async function updateAccountProfileAction(
  prevState: AccountProfileActionState = initialProfileState,
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

export async function setAccountPasswordAction(
  prevState: AccountPasswordActionState = initialPasswordState,
  formData: FormData,
): Promise<AccountPasswordActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = accountSetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted password fields and try again.",
    );
  }

  try {
    await auth.api.setPassword({
      body: {
        newPassword: validationResult.data.newPassword,
      },
      headers: await headers(),
    });

    return {
      success: `Password sign-in enabled for ${user.email}.`,
    };
  } catch (error) {
    console.error("Failed to set account password.", error);

    return {
      error: getAccountSecurityErrorMessage(
        error,
        "We couldn't set your password right now.",
      ),
    };
  }
}

export async function changeAccountPasswordAction(
  prevState: AccountPasswordActionState = initialPasswordState,
  formData: FormData,
): Promise<AccountPasswordActionState> {
  void prevState;

  await requireUser();

  const validationResult = accountChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
    revokeOtherSessions: formData.get("revokeOtherSessions"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted password fields and try again.",
    );
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: validationResult.data.currentPassword,
        newPassword: validationResult.data.newPassword,
        revokeOtherSessions: validationResult.data.revokeOtherSessions,
      },
      headers: await headers(),
    });

    return {
      success: validationResult.data.revokeOtherSessions
        ? "Password updated and other sessions signed out."
        : "Password updated.",
    };
  } catch (error) {
    console.error("Failed to change account password.", error);

    const message = getAccountSecurityErrorMessage(
      error,
      "We couldn't update your password right now.",
    );

    return {
      error: message,
      fieldErrors: message.includes("current password")
        ? {
            currentPassword: [message],
          }
        : undefined,
    };
  }
}

export async function revokeOtherSessionsAction(
  prevState: AccountSessionActionState = initialSessionState,
  formData: FormData,
): Promise<AccountSessionActionState> {
  void prevState;
  void formData;

  await requireUser();

  try {
    await auth.api.revokeOtherSessions({
      headers: await headers(),
    });

    return {
      success: "Other sessions signed out.",
    };
  } catch (error) {
    console.error("Failed to revoke other sessions.", error);

    return {
      error: getAccountSecurityErrorMessage(
        error,
        "We couldn't sign out your other sessions right now.",
      ),
    };
  }
}

export async function deleteAccountAction(
  prevState: AccountDeleteActionState = initialDeleteState,
  formData: FormData,
): Promise<AccountDeleteActionState> {
  void prevState;

  const user = await requireUser();
  const validationResult = accountDeleteSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the highlighted confirmation fields and try again.",
    );
  }

  if (validationResult.data.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      error: "Enter your exact account email to continue.",
      fieldErrors: {
        email: ["This does not match your account email."],
      },
    };
  }

  const security = await getAccountSecurityForUser(user.id, user.email);

  if (security.hasPassword && !validationResult.data.password) {
    return {
      error: "Enter your current password to delete this account.",
      fieldErrors: {
        password: ["Current password is required."],
      },
    };
  }

  let shouldRedirect = false;

  try {
    await auth.api.deleteUser({
      body: {
        password: validationResult.data.password,
      },
      headers: await headers(),
    });

    const cookieStore = await cookies();
    cookieStore.delete(activeBusinessSlugCookieName);
    shouldRedirect = true;
  } catch (error) {
    console.error("Failed to delete account.", error);

    const message = getAccountSecurityErrorMessage(
      error,
      "We couldn't delete your account right now.",
    );

    return {
      error: message,
      fieldErrors: message.includes("current password")
        ? {
            password: [message],
          }
        : undefined,
    };
  }

  if (shouldRedirect) {
    redirect("/login");
  }

  return {
    error: "We couldn't delete your account right now.",
  };
}
