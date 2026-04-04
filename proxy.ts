import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  activeWorkspaceSlugCookieName,
  getWorkspaceDashboardSlugFromPathname,
} from "@/features/workspaces/routes";

export function proxy(request: NextRequest) {
  const workspaceSlug = getWorkspaceDashboardSlugFromPathname(
    request.nextUrl.pathname,
  );

  if (!workspaceSlug) {
    return NextResponse.next();
  }

  request.cookies.set(activeWorkspaceSlugCookieName, workspaceSlug);

  const response = NextResponse.next({
    request,
  });

  response.cookies.set({
    name: activeWorkspaceSlugCookieName,
    value: workspaceSlug,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  matcher: ["/workspace/:slug/dashboard/:path*"],
};
