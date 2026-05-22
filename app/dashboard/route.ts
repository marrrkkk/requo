import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getRecentlyOpenedBusinessesForUser } from "@/features/businesses/recently-opened";
import { getBusinessMembershipsForUser } from "@/lib/db/business-access";
import { getBusinessDashboardPath } from "@/features/businesses/routes";

/**
 * GET /dashboard
 *
 * Server-side resolver that redirects the authenticated user to their
 * most-recently-opened business dashboard. Falls back to the first
 * business alphabetically when no recent activity exists, or redirects
 * to /onboarding when the user has no businesses.
 *
 * Uses 302 (temporary) because the target changes based on user state.
 */
export async function GET(request: Request) {
  const session = await requireSession();
  const userId = session.user.id;

  // Try most-recently-opened first
  const recentBusinesses = await getRecentlyOpenedBusinessesForUser(userId, 1);

  if (recentBusinesses.length > 0) {
    const slug = recentBusinesses[0].slug;
    const url = new URL(getBusinessDashboardPath(slug), request.url);
    return NextResponse.redirect(url, 302);
  }

  // Fall back to first business alphabetically
  const memberships = await getBusinessMembershipsForUser(userId, "active");

  if (memberships.length > 0) {
    const slug = memberships[0].business.slug;
    const url = new URL(getBusinessDashboardPath(slug), request.url);
    return NextResponse.redirect(url, 302);
  }

  // No businesses — send to onboarding
  const url = new URL("/onboarding", request.url);
  return NextResponse.redirect(url, 302);
}
