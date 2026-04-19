import { connection } from "next/server";

import { updateAccountProfileAction } from "@/features/account/actions";
import { ProfileSettingsForm } from "@/features/account/components/profile-settings-form";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireSession } from "@/lib/auth/session";

export default async function AccountProfilePage() {
  await connection();

  const user = await requireSession();

  await ensureProfileForUser({
    id: user.user.id,
    name: user.user.name,
    email: user.user.email,
  });

  const profile = await getAccountProfileForUser(user.user.id);
  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.user.image ?? null,
  });

  return (
    <ProfileSettingsForm
      action={updateAccountProfileAction}
      key={`account-profile-${profile?.updatedAt?.getTime() ?? 0}`}
      profile={{
        fullName: profile?.fullName ?? user.user.name,
        jobTitle: profile?.jobTitle ?? null,
        phone: profile?.phone ?? null,
        avatarStoragePath: profile?.avatarStoragePath ?? null,
        avatarContentType: profile?.avatarContentType ?? null,
        onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
        updatedAt: profile?.updatedAt ?? new Date(),
        email: user.user.email,
        avatarSrc,
        oauthAvatarSrc: user.user.image ?? null,
      }}
    />
  );
}
