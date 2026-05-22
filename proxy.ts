import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminHost } from "@/lib/admin/subdomain-config";
import {
  activeBusinessSlugCookieName,
  getBusinessDashboardSlugFromPathname,
} from "@/features/businesses/routes";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const adminHost = getAdminHost();

  // Admin subdomain: rewrite all requests to the /admin route tree
  if (host === adminHost) {
    const { pathname } = request.nextUrl;

    // Don't rewrite API routes or Next.js internals — they work at their original paths
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Block /admin/* on main app domain in production
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.rewrite(new URL("/not-found", request.url), {
      status: 404,
    });
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
    return NextResponse.next();
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
