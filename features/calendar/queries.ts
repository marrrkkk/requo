import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db/client";
import {
  businessMembers,
  calendarEvents,
  googleCalendarConnections,
  inquiries,
  quotes,
} from "@/lib/db/schema";
import type {
  CalendarConnectionStatus,
  CalendarEventSummaryItem,
} from "./types";
import { decryptValue } from "@/lib/security/encryption";

function readCalendarConnectionSecret(
  encryptedValue: string | null,
  legacyValue: string | null,
  fieldName: string,
) {
  if (encryptedValue) {
    return decryptValue(encryptedValue);
  }

  if (legacyValue) {
    return legacyValue;
  }

  throw new Error(`The Google Calendar connection is missing its ${fieldName}.`);
}

/**
 * Get the user's Google Calendar connection status.
 */
export const getCalendarConnectionForUser = cache(
  async (userId: string): Promise<CalendarConnectionStatus> => {
    const [connection] = await db
      .select({
        googleEmail: googleCalendarConnections.googleEmail,
        selectedCalendarId: googleCalendarConnections.selectedCalendarId,
      })
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId))
      .limit(1);

    if (!connection) {
      return {
        connected: false,
        googleEmail: null,
        selectedCalendarId: null,
      };
    }

    return {
      connected: true,
      googleEmail: connection.googleEmail,
      selectedCalendarId: connection.selectedCalendarId,
    };
  },
);

/**
 * Get the full connection record for token access (server-only).
 */
export async function getCalendarConnectionRecord(userId: string) {
  const [connection] = await db
    .select({
      id: googleCalendarConnections.id,
      userId: googleCalendarConnections.userId,
      googleAccountId: googleCalendarConnections.googleAccountId,
      googleEmail: googleCalendarConnections.googleEmail,
      accessToken: googleCalendarConnections.accessToken,
      accessTokenEncrypted: googleCalendarConnections.accessTokenEncrypted,
      refreshToken: googleCalendarConnections.refreshToken,
      refreshTokenEncrypted: googleCalendarConnections.refreshTokenEncrypted,
      accessTokenExpiresAt: googleCalendarConnections.accessTokenExpiresAt,
      scope: googleCalendarConnections.scope,
      selectedCalendarId: googleCalendarConnections.selectedCalendarId,
      createdAt: googleCalendarConnections.createdAt,
      updatedAt: googleCalendarConnections.updatedAt,
    })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  if (!connection) {
    return null;
  }

  return {
    ...connection,
    accessToken: readCalendarConnectionSecret(
      connection.accessTokenEncrypted,
      connection.accessToken,
      "access token",
    ),
    refreshToken: readCalendarConnectionSecret(
      connection.refreshTokenEncrypted,
      connection.refreshToken,
      "refresh token",
    ),
  };
}

type ResolveAuthorizedCalendarEventTargetInput = {
  userId: string;
  businessId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
};

export async function resolveAuthorizedCalendarEventTarget({
  userId,
  businessId,
  inquiryId,
  quoteId,
}: ResolveAuthorizedCalendarEventTargetInput) {
  const [membership] = await db
    .select({
      businessId: businessMembers.businessId,
    })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.businessId, businessId),
      ),
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  if (inquiryId) {
    const [inquiry] = await db
      .select({
        id: inquiries.id,
      })
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.businessId, businessId)))
      .limit(1);

    if (!inquiry) {
      return null;
    }
  }

  if (quoteId) {
    const [quote] = await db
      .select({
        id: quotes.id,
      })
      .from(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.businessId, businessId)))
      .limit(1);

    if (!quote) {
      return null;
    }
  }

  return {
    businessId,
    inquiryId: inquiryId ?? null,
    quoteId: quoteId ?? null,
  };
}

/**
 * Get calendar events linked to a specific inquiry.
 */
export const getCalendarEventsForInquiry = cache(
  async (
    businessId: string,
    inquiryId: string,
  ): Promise<CalendarEventSummaryItem[]> => {
    return db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        startsAt: calendarEvents.startsAt,
        endsAt: calendarEvents.endsAt,
        eventUrl: calendarEvents.eventUrl,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.businessId, businessId),
          eq(calendarEvents.inquiryId, inquiryId),
        ),
      )
      .orderBy(desc(calendarEvents.startsAt));
  },
);

/**
 * Get calendar events linked to a specific quote.
 */
export const getCalendarEventsForQuote = cache(
  async (
    businessId: string,
    quoteId: string,
  ): Promise<CalendarEventSummaryItem[]> => {
    return db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        startsAt: calendarEvents.startsAt,
        endsAt: calendarEvents.endsAt,
        eventUrl: calendarEvents.eventUrl,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.businessId, businessId),
          eq(calendarEvents.quoteId, quoteId),
        ),
      )
      .orderBy(desc(calendarEvents.startsAt));
  },
);
