import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from "@/lib/google-calendar/client";
import { db } from "@/lib/db/client";
import { googleCalendarConnections } from "@/lib/db/schema";

const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = "gcal-oauth-state";

function getRedirectUri() {
  return `${env.BETTER_AUTH_URL}/api/google-calendar/callback`;
}

/**
 * GET /api/google-calendar/callback
 *
 * Handles the Google OAuth 2.0 callback after the user grants Calendar access.
 * Validates the CSRF state, exchanges the code for tokens, fetches user info,
 * and upserts the connection record.
 */
export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Google Calendar OAuth error:", error);
    redirect("/businesses?gcal_error=denied");
  }

  if (!code || !state) {
    redirect("/businesses?gcal_error=invalid");
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE)?.value;

  cookieStore.delete(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE);

  if (!storedState || storedState !== state) {
    redirect("/businesses?gcal_error=state_mismatch");
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, getRedirectUri());

    if (!tokens.refresh_token) {
      redirect("/businesses?gcal_error=no_refresh_token");
    }

    // Fetch the connected Google account identity
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const connectionId = crypto.randomUUID();
    const now = new Date();

    // Upsert the connection (one per user)
    await db
      .insert(googleCalendarConnections)
      .values({
        id: connectionId,
        userId: user.id,
        googleAccountId: userInfo.sub,
        googleEmail: userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt: expiresAt,
        scope: tokens.scope,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: googleCalendarConnections.userId,
        set: {
          googleAccountId: userInfo.sub,
          googleEmail: userInfo.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: expiresAt,
          scope: tokens.scope,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("Failed to save Google Calendar connection:", err);
    redirect("/businesses?gcal_error=save_failed");
  }

  // Redirect back to a settings page — the slug is not available here,
  // so we redirect to the businesses hub with a success indicator.
  redirect("/businesses?gcal_connected=true");
}
