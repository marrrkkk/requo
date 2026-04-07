import { PageHeader } from "@/components/shared/page-header";
import { updateAccountProfileAction } from "@/features/account/actions";
import { ProfileSettingsForm } from "@/features/account/components/profile-settings-form";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { getBusinessOwnerPageContext } from "../_lib/page-context";

export default async function BusinessProfileSettingsPage() {
  const { user } = await getBusinessOwnerPageContext();

  await ensureProfileForUser({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  const profile = await getAccountProfileForUser(user.id);
  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile?.avatarStoragePath,
    profileUpdatedAt: profile?.updatedAt,
    oauthImage: user.image ?? null,
  });

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your owner details and the profile photo shown in the dashboard."
      />

      <ProfileSettingsForm
        action={updateAccountProfileAction}
        profile={{
          fullName: profile?.fullName ?? user.name,
          jobTitle: profile?.jobTitle ?? null,
          phone: profile?.phone ?? null,
          avatarStoragePath: profile?.avatarStoragePath ?? null,
          avatarContentType: profile?.avatarContentType ?? null,
          onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
          updatedAt: profile?.updatedAt ?? new Date(),
          email: user.email,
          avatarSrc,
          oauthAvatarSrc: user.image ?? null,
        }}
      />
    </>
  );
}
