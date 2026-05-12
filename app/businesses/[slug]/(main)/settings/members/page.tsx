import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessMembersPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Members",
  description: "Redirects to the business members management page.",
});

export const unstable_instant = false;

export default async function BusinessMembersSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(getBusinessMembersPath(slug));
}
