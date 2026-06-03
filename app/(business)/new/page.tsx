import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountUserMenu } from "@/features/account/components/account-user-menu";
import { getAccountProfileForUser } from "@/features/account/queries";
import { resolveUserAvatarSrc } from "@/features/account/utils";
import { createBusinessAction } from "@/features/businesses/actions";
import { CreateBusinessForm } from "@/features/businesses/components/create-business-form";
import { getBusinessQuotaForUser } from "@/features/businesses/quota";
import { dashboardPath } from "@/features/businesses/routes";
import { onboardingPath } from "@/features/onboarding/routes";
import { UpgradePrompt } from "@/features/paywall";
import { planMeta } from "@/lib/plans/plans";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  absoluteTitle: "New Business - Requo",
  description: "Create a new business workspace.",
});

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default function NewBusinessPage() {
  return (
    <Suspense fallback={<NewBusinessPageSkeleton />}>
      <NewBusinessPageContent />
    </Suspense>
  );
}

async function NewBusinessPageContent() {
  await connection();
  const session = await requireSession();
  const userId = session.user.id;

  const [profile, businessQuota] = await Promise.all([
    getAccountProfileForUser(userId),
    getBusinessQuotaForUser({ ownerUserId: userId }),
  ]);

  if (!profile?.onboardingCompletedAt) {
    redirect(onboardingPath);
  }

  const avatarSrc = resolveUserAvatarSrc({
    avatarStoragePath: profile.avatarStoragePath,
    profileUpdatedAt: profile.updatedAt,
    oauthImage: session.user.image ?? null,
  });

  const businessId = crypto.randomUUID();

  return (
    <div className="min-h-svh w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark subtitle="Businesses" href={dashboardPath} />
          <div className="h-4 w-px bg-border max-sm:hidden" />
        </div>
        <div className="flex items-center gap-3">
          <AccountUserMenu
            user={{
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
              avatarSrc,
            }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-2 pb-8">
          <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
            Create a new business
          </h1>
          <p className="max-w-2xl text-sm leading-normal text-muted-foreground sm:text-[0.96rem] sm:leading-7">
            Set up a new workspace with inquiry capture, quote defaults, and
            follow-up basics.
          </p>
        </div>

        {businessQuota.allowed ? (
          <CreateBusinessForm
            action={createBusinessAction}
            businessId={businessId}
            standalone
          />
        ) : (
          <UpgradePrompt
            variant="empty-state"
            plan={businessQuota.plan}
            description={`Your ${planMeta[businessQuota.plan].label} plan supports ${businessQuota.limit === 1 ? "1 business" : `${businessQuota.limit} businesses`}. You already have ${businessQuota.current}. Upgrade to add more.`}
          />
        )}
      </main>
    </div>
  );
}

function NewBusinessPageSkeleton() {
  return (
    <div className="min-h-svh w-full bg-background">
      <header className="sticky top-0 z-10 flex h-[4.5rem] w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <BrandMark subtitle="Businesses" href={dashboardPath} />
          <div className="h-4 w-px bg-border max-sm:hidden" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-2 pb-8">
          <h1 className="font-heading text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.35rem]">
            Create a new business
          </h1>
          <p className="max-w-2xl text-sm leading-normal text-muted-foreground sm:text-[0.96rem] sm:leading-7">
            Set up a new workspace with inquiry capture, quote defaults, and
            follow-up basics.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
