/** Google OAuth token response from the token exchange endpoint. */
export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
};

/** Google userinfo response for identifying the connected account. */
export type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

/** A calendar entry from the Google Calendar list API. */
export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: "owner" | "writer" | "reader" | "freeBusyReader";
  backgroundColor?: string;
};

/** Response from the Google Calendar list API. */
export type GoogleCalendarListResponse = {
  kind: string;
  items: GoogleCalendarListEntry[];
};

/** Attendee for a Google Calendar event. */
export type GoogleEventAttendee = {
  email: string;
  displayName?: string;
  optional?: boolean;
};

/** Payload for creating a Google Calendar event. */
export type GoogleEventCreatePayload = {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: GoogleEventAttendee[];
};

/** Response from creating a Google Calendar event. */
export type GoogleEventCreateResponse = {
  id: string;
  htmlLink: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  status: string;
};
