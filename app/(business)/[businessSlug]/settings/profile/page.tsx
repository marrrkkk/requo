import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { PageHeader } from "@/components/shared/page-header";
import { DashboardSettingsProfileSkeleton } from "@/components/shell/dashboard-settings-skeleton";
import { updateAccountProfileAction } from "@/features/account/actions";
import { ProfileSettingsForm } from "@/features/account/components/profile-settings-form";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Profile",
  description: "Update the profile details shown across your Requo account.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

export default function SettingsProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        description="Update your personal details shown across your account."
      />
      <Suspense fallback={<DashboardSettingsProfileSkeleton />}>
        <SettingsProfileContent />
      </Suspense>
    </>
  );
}

async function SettingsProfileContent() {
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
        dashboardTourCompletedAt: profile?.dashboardTourCompletedAt ?? null,
        formEditorTourCompletedAt: profile?.formEditorTourCompletedAt ?? null,
        updatedAt: profile?.updatedAt ?? new Date(),
        email: user.user.email,
        avatarSrc,
        oauthAvatarSrc: user.user.image ?? null,
      }}
    />
  );
}
