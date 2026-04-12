import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { buildGoogleOAuthUrl } from "@/lib/google-calendar/client";
import { GOOGLE_CALENDAR_SCOPE_STRING } from "@/lib/google-calendar/scopes";

const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = "gcal-oauth-state";

function getRedirectUri() {
  return `${env.BETTER_AUTH_URL}/api/google-calendar/callback`;
}

/**
 * GET /api/google-calendar/connect
 *
 * Initiates the Google OAuth consent flow for Calendar access.
 * Generates a CSRF state token, stores it in a cookie,
 * and redirects the user to Google's consent screen.
 */
export async function GET() {
  await requireUser();

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return new Response("Google Calendar integration is not configured.", {
      status: 400,
    });
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const authUrl = buildGoogleOAuthUrl(
    getRedirectUri(),
    state,
    GOOGLE_CALENDAR_SCOPE_STRING,
  );

  redirect(authUrl);
}
