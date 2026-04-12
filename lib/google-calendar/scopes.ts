/**
 * Minimum Google OAuth scopes for Calendar integration.
 *
 * - calendar.events: create, read, update events
 * - calendar.readonly: list available calendars for target selection
 */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const GOOGLE_CALENDAR_SCOPE_STRING = GOOGLE_CALENDAR_SCOPES.join(" ");
