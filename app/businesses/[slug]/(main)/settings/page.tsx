import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDefaultBusinessSettingsPath } from "@/features/settings/navigation";
import { getBusinessSettingsPageContext } from "./_lib/page-context";

export const metadata: Metadata = {
  title: "Settings",
};

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
