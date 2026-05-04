import { redirect } from "next/navigation";

import {
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForMembershipSlug } from "@/lib/db/business-access";

type KnowledgePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function KnowledgePage({ params }: KnowledgePageProps) {
  const [session, { slug }] = await Promise.all([requireSession(), params]);
  const businessContext = await getBusinessContextForMembershipSlug(
    session.user.id,
    slug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  redirect(getBusinessSettingsPath(businessContext.business.slug, "knowledge"));
}
