import { redirect } from "next/navigation";

import { getProfileSettingsPath } from "@/features/account/routes";
import { businessesHubPath } from "@/features/businesses/routes";
import { requireSession } from "@/lib/auth/session";
import { getBusinessContextForUser } from "@/lib/db/business-access";

export default async function AccountProfilePage() {
  const session = await requireSession();
  const businessContext = await getBusinessContextForUser(session.user.id);

  if (!businessContext) {
    redirect(businessesHubPath);
  }

  redirect(getProfileSettingsPath(businessContext.business.slug));
}
