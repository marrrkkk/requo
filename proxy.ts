import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminHost } from "@/lib/admin/subdomain-config";
import {
  activeBusinessSlugCookieName,
  getBusinessDashboardSlugFromPathname,
} from "@/features/businesses/routes";
import {
  isPrivateRoutePrefix,
  isPublicRoutePrefix,
} from "@/lib/seo/route-registry";

const AUTHENTICATED_APP_NOINDEX = "noindex, nofollow, noarchive";

/**
 * Adds `X-Robots-Tag` for authenticated business-scoped app routes at
 * `/:businessSlug/*` that are not covered by static header rules in
 * `next.config.ts`.
 */
function finalizeProxyResponse(request: NextRequest, response: NextResponse) {
  const pathname = request.nextUrl.pathname;

  if (!isPublicRoutePrefix(pathname) && !isPrivateRoutePrefix(pathname)) {
    response.headers.set("X-Robots-Tag", AUTHENTICATED_APP_NOINDEX);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const adminHost = getAdminHost();

  // Admin subdomain: rewrite all requests to the /admin route tree
  if (host === adminHost) {
    const { pathname } = request.nextUrl;

    // Don't rewrite API routes or Next.js internals — they work at their original paths
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return finalizeProxyResponse(request, NextResponse.next());
    }

    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Markdown agent discovery
  if (
    request.nextUrl.pathname === "/" &&
    request.headers.get("accept")?.includes("text/markdown")
  ) {
    return NextResponse.rewrite(new URL("/api/public/markdown", request.url));
  }

  // Business slug cookie for dashboard routing
  const businessSlug = getBusinessDashboardSlugFromPathname(
    request.nextUrl.pathname,
  );

  if (!businessSlug) {
    return finalizeProxyResponse(request, NextResponse.next());
  }

  const response = NextResponse.next();

  response.cookies.set({
    name: activeBusinessSlugCookieName,
    value: businessSlug,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return finalizeProxyResponse(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
