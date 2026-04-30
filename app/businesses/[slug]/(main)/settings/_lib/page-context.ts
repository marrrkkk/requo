import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import {
  getBusinessDashboardPath,
} from "@/features/businesses/routes";
import { workspacesHubPath } from "@/features/workspaces/routes";
import {
  getBusinessContextForMembershipSlug,
  hasOperationalBusinessAccess,
  requireCurrentBusinessContext,
} from "@/lib/db/business-access";
import { requireUser } from "@/lib/auth/session";

async function getScopedBusinessSettingsContext(businessSlug?: string | null) {
  if (!businessSlug) {
    return requireCurrentBusinessContext();
  }

  const user = await requireUser();
  const businessContext = await getBusinessContextForMembershipSlug(
    user.id,
    businessSlug,
  );

  if (!businessContext) {
    redirect(workspacesHubPath);
  }

  return {
    user,
    businessContext,
  };
}

export const getBusinessSettingsPageContext = cache(async (businessSlug?: string) => {
  return getScopedBusinessSettingsContext(businessSlug);
});

export const getBusinessOperationalPageContext = cache(async (businessSlug?: string) => {
  const context = await getScopedBusinessSettingsContext(businessSlug);

  if (!hasOperationalBusinessAccess(context.businessContext.role)) {
    redirect(getBusinessDashboardPath(context.businessContext.business.slug));
  }

  return context;
});

export const getBusinessOwnerPageContext = cache(async (businessSlug?: string) => {
  const context = await getScopedBusinessSettingsContext(businessSlug);

  if (context.businessContext.role !== "owner") {
    redirect(getBusinessDashboardPath(context.businessContext.business.slug));
  }

  return context;
});
