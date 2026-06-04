import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { getAccountProfileForUser } from "@/features/account/queries";
import { isSupportedBusinessCountryCode } from "@/features/businesses/locale";
import { dashboardPath } from "@/features/businesses/routes";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { ThemePreferenceSync } from "@/features/theme/components/theme-preference-sync";
import { getThemePreferenceForUser } from "@/features/theme/queries";
import { ensureProfileForUser } from "@/lib/auth/business-bootstrap";
import { requireSession } from "@/lib/auth/session";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { timed } from "@/lib/dev/server-timing";
import { createNoIndexMetadata } from "@/lib/seo/site";

import OnboardingLoading from "./loading";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "Onboarding - Requo",
  description: "Set up your first business to start capturing inquiries.",
});

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

/**
 * Onboarding page — non-blocking structural shell.
 *
 * Returns the structural shell synchronously with skeleton fallback.
 * All dynamic reads (session, profile, memberships, geo-detection)
 * are resolved inside a Suspense-wrapped child server component.
 */
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingPageContent />
    </Suspense>
  );
}

async function OnboardingPageContent() {
  const session = await requireSession();

  await ensureProfileForUser({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });

  const [themePreference, memberships, profile] = await timed(
    "onboarding.parallelShellFetches",
    Promise.all([
      getThemePreferenceForUser(session.user.id),
      getBusinessMembershipsForUser(session.user.id),
      getAccountProfileForUser(session.user.id),
    ]),
  );

  if (memberships.length > 0 || profile?.onboardingCompletedAt) {
    redirect(dashboardPath);
  }

  const headerStore = await headers();
  const geoCountry =
    headerStore.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  const detectedCountryCode = isSupportedBusinessCountryCode(geoCountry)
    ? geoCountry
    : "";

  return (
    <>
      <ThemePreferenceSync
        themePreference={themePreference}
        userId={session.user.id}
      />
      <div className="min-h-svh">
        <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <div className="fixed top-4 left-4 z-10 sm:left-6 lg:left-8">
            <BrandMark subtitle={null} />
          </div>

          <div className="flex flex-1 items-center justify-center pt-12 pb-6 sm:pt-8">
            <OnboardingForm
              action={completeOnboardingAction}
              detectedCountryCode={detectedCountryCode}
              initialProfile={{
                firstName: extractFirstName(session.user.name),
                lastName: extractLastName(session.user.name),
                avatarUrl: session.user.image ?? null,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function extractFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? "";
}

function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}
