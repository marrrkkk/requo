import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/brand-mark";
import { getAccountProfileForUser } from "@/features/account/queries";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { AppearanceMenu } from "@/features/theme/components/appearance-menu";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireSession } from "@/lib/auth/session";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";

export default async function OnboardingPage() {
  const session = await requireSession();

  await ensureProfileForUser({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });

  const [themePreference, memberships, profile] = await Promise.all([
    getThemePreferenceForUser(session.user.id),
    getBusinessMembershipsForUser(session.user.id),
    getAccountProfileForUser(session.user.id),
  ]);

  if (memberships.length > 0 || profile?.onboardingCompletedAt) {
    redirect(workspacesHubPath);
  }

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={session.user.id}
      />
      <div className="min-h-svh">
        <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <BrandMark subtitle={null} />
            <AppearanceMenu userId={session.user.id} />
          </header>

          <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <OnboardingForm action={completeOnboardingAction} />
          </div>
        </div>
      </div>
    </>
  );
}
