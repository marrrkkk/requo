import { redirect } from "next/navigation";

import {
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type KnowledgePageProps = {
  params: Promise<{ slug: string }>;
};

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function KnowledgePage({ params }: KnowledgePageProps) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  redirect(getBusinessSettingsPath(businessContext.business.slug, "knowledge"));
}
