import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessMembersPath } from "@/features/businesses/routes";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Members",
  description: "Redirects to the business members management page.",
});

export const unstable_instant = { prefetch: 'static', unstable_disableValidation: true };

export default async function BusinessMembersSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  redirect(getBusinessMembersPath(businessSlug));
}
