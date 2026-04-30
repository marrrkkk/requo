import { redirect } from "next/navigation";

import { getBusinessMembersPath } from "@/features/businesses/routes";

export default async function BusinessMembersSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(getBusinessMembersPath(slug));
}
