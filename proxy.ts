import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  activeBusinessSlugCookieName,
  getActiveBusinessCookieAttributes,
  getBusinessDashboardSlugFromPathname,
  isValidActiveBusinessSlug,
} from "@/features/businesses/routes";
import {
  isPrivateRoutePrefix,
  isPublicRoutePrefix,
} from "@/lib/seo/route-registry";

const AUTHENTICATED_APP_NOINDEX = "noindex, nofollow, noarchive";
// Mirrors `authenticatedAppShellHeaders` in `next.config.ts`: user-private
// app routes must not hit shared caches, but the Next.js router cache needs
// `private, max-age=0, must-revalidate` to honor `experimental.staleTimes`.
// Without it every sibling/back navigation re-fetches from origin and the
// destination flashes its Suspense skeleton instead of painting instantly.
// Static header rules cannot express `/:businessSlug/*`, so business-scoped
// routes are covered here (precisely: paths that are neither public nor
// private per the route registry).
const AUTHENTICATED_APP_CACHE_CONTROL = "private, max-age=0, must-revalidate";

/**
 * Adds `X-Robots-Tag` (and router-cache `Cache-Control`) for authenticated
 * business-scoped app routes at `/:businessSlug/*` that are not covered by
 * static header rules in `next.config.ts`.
 */
function finalizeProxyResponse(request: NextRequest, response: NextResponse) {
  const pathname = request.nextUrl.pathname;

  if (!isPublicRoutePrefix(pathname) && !isPrivateRoutePrefix(pathname)) {
    response.headers.set("X-Robots-Tag", AUTHENTICATED_APP_NOINDEX);
    response.headers.set("Cache-Control", AUTHENTICATED_APP_CACHE_CONTROL);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  // Markdown agent discovery
  if (
    request.nextUrl.pathname === "/" &&
    request.headers.get("accept")?.includes("text/markdown")
  ) {
    return NextResponse.rewrite(new URL("/api/public/markdown", request.url));
  }

  // Legacy account URLs redirect into the unified business settings
  // profile page (profile, password, devices, and deletion live there).
  if (
    request.nextUrl.pathname === "/account/profile" ||
    request.nextUrl.pathname === "/account/security"
  ) {
    const activeSlug = request.cookies.get(
      activeBusinessSlugCookieName,
    )?.value;
    const url = request.nextUrl.clone();
    url.pathname = activeSlug ? `/${activeSlug}/settings/profile` : "/home";
    return finalizeProxyResponse(request, NextResponse.redirect(url));
  }

  // Business slug cookie for dashboard routing. Only well-formed slugs are
  // persisted so a crafted path segment cannot poison the active-business
  // cookie used by cookie-dependent server actions.
  const businessSlug = getBusinessDashboardSlugFromPathname(
    request.nextUrl.pathname,
  );

  if (!businessSlug || !isValidActiveBusinessSlug(businessSlug)) {
    return finalizeProxyResponse(request, NextResponse.next());
  }

  const response = NextResponse.next();

  response.cookies.set({
    name: activeBusinessSlugCookieName,
    value: businessSlug,
    ...getActiveBusinessCookieAttributes(),
  });

  return finalizeProxyResponse(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
