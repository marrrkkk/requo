import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activityLogs,
  calendarEvents,
  googleCalendarConnections,
} from "@/lib/db/schema";

/**
 * Update the stored access token after a refresh.
 */
export async function updateCalendarAccessToken(
  userId: string,
  accessToken: string,
  expiresAt: Date,
) {
  await db
    .update(googleCalendarConnections)
    .set({
      accessToken,
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.userId, userId));
}

/**
 * Update the user's selected target calendar.
 */
export async function updateSelectedCalendar(
  userId: string,
  calendarId: string,
) {
  await db
    .update(googleCalendarConnections)
    .set({
      selectedCalendarId: calendarId,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.userId, userId));
}

/**
 * Remove the user's Google Calendar connection.
 */
export async function removeCalendarConnection(userId: string) {
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId));
}

/**
 * Save a reference to a created calendar event.
 */
export async function saveCalendarEventRecord(params: {
  businessId: string;
  userId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  googleEventId: string;
  googleCalendarId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  eventUrl: string | null;
}) {
  const eventId = crypto.randomUUID();

  await db.insert(calendarEvents).values({
    id: eventId,
    businessId: params.businessId,
    userId: params.userId,
    inquiryId: params.inquiryId ?? null,
    quoteId: params.quoteId ?? null,
    googleEventId: params.googleEventId,
    googleCalendarId: params.googleCalendarId,
    title: params.title,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    eventUrl: params.eventUrl,
  });

  return eventId;
}

/**
 * Log a calendar event creation in the activity log.
 */
export async function logCalendarEventActivity(params: {
  businessId: string;
  userId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  eventTitle: string;
  eventDate: string;
  googleEventId: string;
  eventUrl: string | null;
}) {
  const activityId = crypto.randomUUID();

  await db.insert(activityLogs).values({
    id: activityId,
    businessId: params.businessId,
    actorUserId: params.userId,
    inquiryId: params.inquiryId ?? null,
    quoteId: params.quoteId ?? null,
    type: "calendar_event_created",
    summary: `Scheduled "${params.eventTitle}" on ${params.eventDate}`,
    metadata: {
      googleEventId: params.googleEventId,
      eventUrl: params.eventUrl,
    },
  });
}
