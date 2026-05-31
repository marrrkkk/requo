import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { AppearanceSettingsForm } from "@/features/theme/components/appearance-settings-form";
import { requireSession } from "@/lib/auth/session";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Appearance",
  description: "Choose your preferred color theme for Requo.",
});

export default async function SettingsAppearancePage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader
        eyebrow="Personal"
        title="Appearance"
        description="Choose how Requo looks — pick a color scheme that suits you."
      />
      <AppearanceSettingsForm userId={session.user.id} />
    </>
  );
}
