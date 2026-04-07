import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { updateAccountProfileAction } from "@/features/account/actions";
import { ProfileSettingsForm } from "@/features/account/components/profile-settings-form";
import { getAccountProfileForUser } from "@/features/account/queries";
import { businessesHubPath } from "@/features/businesses/routes";
import { AppearanceMenu } from "@/features/theme/components/appearance-menu";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireSession } from "@/lib/auth/session";

export default async function AccountProfilePage() {
  const session = await requireSession();

  await ensureProfileForUser({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });

  const [themePreference, profile] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
  ]);

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={session.user.id}
      />
      <div className="min-h-svh">
        <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <BrandMark subtitle="Account" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AppearanceMenu userId={session.user.id} />
              <Button asChild variant="outline">
                <Link href={businessesHubPath} prefetch={true}>
                  Back to businesses
                </Link>
              </Button>
            </div>
          </header>

          <div className="flex-1 py-8">
            <PageHeader
              eyebrow="Account"
              title="Your profile"
              description="Keep the owner details tied to your account up to date."
            />

            <div className="mt-8">
              <ProfileSettingsForm
                action={updateAccountProfileAction}
                profile={{
                  fullName: profile?.fullName ?? session.user.name,
                  jobTitle: profile?.jobTitle ?? null,
                  phone: profile?.phone ?? null,
                  onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
                  email: session.user.email,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
