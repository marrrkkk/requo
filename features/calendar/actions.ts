"use server";

import { revalidatePath } from "next/cache";

import { getValidationActionState, getUserSafeErrorMessage } from "@/lib/action-state";
import { requireUser } from "@/lib/auth/session";
import {
  createCalendarEvent,
  getValidAccessToken,
} from "@/lib/google-calendar/client";
import {
  createCalendarEventSchema,
  updateSelectedCalendarSchema,
} from "./schemas";
import {
  logCalendarEventActivity,
  removeCalendarConnection,
  saveCalendarEventRecord,
  updateCalendarAccessToken,
  updateSelectedCalendar,
} from "./mutations";
import { getCalendarConnectionRecord } from "./queries";
import { revokeGoogleToken } from "@/lib/google-calendar/client";
import type {
  CalendarEventActionState,
  DisconnectCalendarActionState,
  UpdateCalendarActionState,
} from "./types";

/**
 * Create a Google Calendar event from an inquiry or quote context.
 */
export async function createCalendarEventAction(
  _prevState: CalendarEventActionState,
  formData: FormData,
): Promise<CalendarEventActionState> {
  const user = await requireUser();
  const connection = await getCalendarConnectionRecord(user.id);

  if (!connection) {
    return { error: "Connect Google Calendar first." };
  }

  const validationResult = createCalendarEventSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    startDateTime: formData.get("startDateTime") ?? "",
    endDateTime: formData.get("endDateTime") ?? "",
    location: formData.get("location") ?? "",
    attendeeEmail: formData.get("attendeeEmail") ?? "",
    calendarId: formData.get("calendarId") || undefined,
    businessId: formData.get("businessId") ?? "",
    inquiryId: formData.get("inquiryId") || undefined,
    quoteId: formData.get("quoteId") || undefined,
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Check the event details and try again.",
    );
  }

  const data = validationResult.data;

  try {
    // Get a valid access token, refreshing if needed
    const tokenResult = await getValidAccessToken(connection);

    if (tokenResult.refreshed) {
      await updateCalendarAccessToken(
        user.id,
        tokenResult.accessToken,
        tokenResult.expiresAt,
      );
    }

    const calendarId =
      data.calendarId || connection.selectedCalendarId || "primary";

    const startDate = new Date(data.startDateTime);
    const endDate = new Date(data.endDateTime);

    if (endDate <= startDate) {
      return {
        error: "End time must be after the start time.",
        fieldErrors: {
          endDateTime: ["End time must be after the start time."],
        },
      };
    }

    // Create the event in Google Calendar
    const googleEvent = await createCalendarEvent(
      tokenResult.accessToken,
      calendarId,
      {
        summary: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        attendees: data.attendeeEmail
          ? [{ email: data.attendeeEmail }]
          : undefined,
      },
    );

    // Save the event reference
    await saveCalendarEventRecord({
      businessId: data.businessId,
      userId: user.id,
      inquiryId: data.inquiryId,
      quoteId: data.quoteId,
      googleEventId: googleEvent.id,
      googleCalendarId: calendarId,
      title: data.title,
      startsAt: startDate,
      endsAt: endDate,
      eventUrl: googleEvent.htmlLink ?? null,
    });

    // Log activity
    const eventDateFormatted = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await logCalendarEventActivity({
      businessId: data.businessId,
      userId: user.id,
      inquiryId: data.inquiryId,
      quoteId: data.quoteId,
      eventTitle: data.title,
      eventDate: eventDateFormatted,
      googleEventId: googleEvent.id,
      eventUrl: googleEvent.htmlLink ?? null,
    });

    // Revalidate the relevant detail pages
    if (data.inquiryId) {
      revalidatePath(`/businesses/[slug]/dashboard/inquiries/${data.inquiryId}`);
    }

    if (data.quoteId) {
      revalidatePath(`/businesses/[slug]/dashboard/quotes/${data.quoteId}`);
    }

    return {
      success: "Event created in Google Calendar.",
      eventUrl: googleEvent.htmlLink,
    };
  } catch (err) {
    console.error("Failed to create calendar event:", err);

    return {
      error: getUserSafeErrorMessage(
        err,
        "We couldn't create the calendar event right now.",
      ),
    };
  }
}

/**
 * Update the user's selected target calendar.
 */
export async function updateSelectedCalendarAction(
  _prevState: UpdateCalendarActionState,
  formData: FormData,
): Promise<UpdateCalendarActionState> {
  const user = await requireUser();

  const validationResult = updateSelectedCalendarSchema.safeParse({
    calendarId: formData.get("calendarId"),
  });

  if (!validationResult.success) {
    return getValidationActionState(
      validationResult.error,
      "Choose a calendar and try again.",
    );
  }

  try {
    await updateSelectedCalendar(user.id, validationResult.data.calendarId);

    return { success: "Default calendar updated." };
  } catch (err) {
    console.error("Failed to update selected calendar:", err);

    return {
      error: getUserSafeErrorMessage(
        err,
        "We couldn't save the calendar preference right now.",
      ),
    };
  }
}

/**
 * Disconnect the user's Google Calendar.
 */
export async function disconnectGoogleCalendarAction(): Promise<DisconnectCalendarActionState> {
  const user = await requireUser();
  const connection = await getCalendarConnectionRecord(user.id);

  if (!connection) {
    return { success: "Google Calendar is not connected." };
  }

  try {
    await revokeGoogleToken(connection.refreshToken);
    await removeCalendarConnection(user.id);

    return { success: "Google Calendar disconnected." };
  } catch (err) {
    console.error("Failed to disconnect Google Calendar:", err);

    return {
      error: getUserSafeErrorMessage(
        err,
        "We couldn't disconnect Google Calendar right now.",
      ),
    };
  }
}
