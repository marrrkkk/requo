import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearanceSettingsForm } from "@/features/theme/components/appearance-settings-form";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Appearance",
  description: "Choose your preferred color theme for Requo.",
});

export const instant = true;

/**
 * Appearance settings page — returns the structural shell synchronously.
 *
 * The session read moves into a Suspense-wrapped child so the header paints
 * instantly on sibling navigation; the theme form streams in behind a
 * dimensionally accurate skeleton.
 */
export default function SettingsAppearancePage() {
  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Appearance"
        description="Choose how Requo looks — pick a color scheme that suits you."
      />
      <Suspense fallback={<AppearanceFormSkeleton />}>
        <AppearanceFormRegion />
      </Suspense>
    </>
  );
}

async function AppearanceFormRegion() {
  const session = await requireSession();

  return <AppearanceSettingsForm userId={session.user.id} />;
}

function AppearanceFormSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Skeleton className="size-5 rounded-md" />
          <div className="flex w-full flex-col gap-1.5">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
