import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDefaultBusinessSettingsPath } from "@/features/settings/navigation";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessSettingsPageContext } from "./_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Settings",
  description: "Business settings hub for the signed-in team.",
});

export default async function SettingsPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;
  const { businessContext } = await getBusinessSettingsPageContext(slug);

  redirect(
    getDefaultBusinessSettingsPath(
      businessContext.business.slug,
      businessContext.role,
    ),
  );
}
