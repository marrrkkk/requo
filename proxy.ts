import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  activeBusinessSlugCookieName,
  getBusinessDashboardSlugFromPathname,
} from "@/features/businesses/routes";

export function proxy(request: NextRequest) {
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
  matcher: ["/businesses/:slug/dashboard/:path*", "/businesses/:slug/preview/:path*"],
};
