import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  activeBusinessSlugCookieName,
  getBusinessDashboardSlugFromPathname,
} from "@/features/businesses/routes";
import { hasAdminProxyAccess } from "@/features/admin/proxy-auth";

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function adminNotFound() {
  return new NextResponse(null, { status: 404 });
}

export async function proxy(request: NextRequest) {
  if (isAdminPath(request.nextUrl.pathname)) {
    const isAdmin = await hasAdminProxyAccess(request.headers);

    if (!isAdmin) {
      return adminNotFound();
    }

    return NextResponse.next();
  }

  if (
    request.nextUrl.pathname === "/" &&
    request.headers.get("accept")?.includes("text/markdown")
  ) {
    return NextResponse.rewrite(new URL("/api/public/markdown", request.url));
  }

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
    "/",
    "/admin",
    "/admin/:path*",
    "/businesses/:slug/dashboard/:path*",
    "/businesses/:slug/preview/:path*",
  ],
};
