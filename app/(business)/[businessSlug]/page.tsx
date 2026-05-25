import { redirect } from "next/navigation";

import { getBusinessDashboardPath } from "@/features/businesses/routes";

type BusinessSlugIndexPageProps = {
  params: Promise<{ businessSlug: string }>;
};

export default async function BusinessSlugIndexPage({
  params,
}: BusinessSlugIndexPageProps) {
  const { businessSlug } = await params;

  redirect(getBusinessDashboardPath(businessSlug));
}
