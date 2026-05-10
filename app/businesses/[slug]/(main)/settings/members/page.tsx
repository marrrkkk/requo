import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBusinessMembersPath } from "@/features/businesses/routes";

export const metadata: Metadata = {
  title: "Members",
};

export const unstable_instant = false;

export default async function BusinessMembersSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(getBusinessMembersPath(slug));
}
