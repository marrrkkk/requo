import "server-only";

import { env } from "@/lib/env";

import type {
  GoogleCalendarListEntry,
  GoogleCalendarListResponse,
  GoogleEventCreatePayload,
  GoogleEventCreateResponse,
  GoogleTokenResponse,
  GoogleUserInfo,
} from "./types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token exchange failed: ${errorBody}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

/**
 * Refresh an expired access token using a refresh token.
 * Returns the new access token and its expiry.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token refresh failed: ${errorBody}`);
  }

  const data = (await response.json()) as GoogleTokenResponse;

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Fetch the Google user info for the authenticated user.
 */
export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google user info.");
  }

  return response.json() as Promise<GoogleUserInfo>;
}

/**
 * Revoke a Google OAuth token (access or refresh).
 * Best-effort; does not throw on failure.
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // Best-effort revocation — ignore network errors.
  }
}

/**
 * Get a valid access token for the given connection, refreshing if expired.
 * Returns the updated access token and expiry (caller should persist if changed).
 */
export async function getValidAccessToken(connection: {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
}): Promise<{
  accessToken: string;
  expiresAt: Date;
  refreshed: boolean;
}> {
  const bufferMs = 60_000; // refresh 1 minute before expiry
  const isExpired =
    connection.accessTokenExpiresAt.getTime() - bufferMs < Date.now();

  if (!isExpired) {
    return {
      accessToken: connection.accessToken,
      expiresAt: connection.accessTokenExpiresAt,
      refreshed: false,
    };
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);

  return {
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    refreshed: true,
  };
}

/**
 * List calendars available to the user.
 * Returns only calendars where the user can create events.
 */
export async function listWritableCalendars(
  accessToken: string,
): Promise<GoogleCalendarListEntry[]> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?minAccessRole=writer`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google calendars.");
  }

  const data = (await response.json()) as GoogleCalendarListResponse;

  return data.items ?? [];
}

/**
 * Create a calendar event in the specified calendar.
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  payload: GoogleEventCreatePayload,
): Promise<GoogleEventCreateResponse> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${errorBody}`);
  }

  return response.json() as Promise<GoogleEventCreateResponse>;
}

/**
 * Build the Google OAuth authorization URL for Calendar access.
 */
export function buildGoogleOAuthUrl(
  redirectUri: string,
  state: string,
  scopeString: string,
): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopeString,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
