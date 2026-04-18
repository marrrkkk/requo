import "dotenv/config";

import { eq, isNotNull, or } from "drizzle-orm";

import { db, dbConnection } from "../lib/db/client";
import {
  businessMemberInvites,
  googleCalendarConnections,
  quotes,
} from "../lib/db/schema";
import { encryptValue } from "../lib/security/encryption";
import { hashOpaqueToken } from "../lib/security/tokens";

async function backfillQuotePublicTokens() {
  const rows = await db
    .select({
      id: quotes.id,
      publicToken: quotes.publicToken,
    })
    .from(quotes)
    .where(isNotNull(quotes.publicToken));

  for (const row of rows) {
    if (!row.publicToken) {
      continue;
    }

    await db
      .update(quotes)
      .set({
        publicToken: null,
        publicTokenEncrypted: encryptValue(row.publicToken),
        publicTokenHash: hashOpaqueToken(row.publicToken),
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, row.id));
  }

  return rows.length;
}

async function backfillBusinessInviteTokens() {
  const rows = await db
    .select({
      id: businessMemberInvites.id,
      token: businessMemberInvites.token,
    })
    .from(businessMemberInvites)
    .where(isNotNull(businessMemberInvites.token));

  for (const row of rows) {
    if (!row.token) {
      continue;
    }

    await db
      .update(businessMemberInvites)
      .set({
        token: null,
        tokenHash: hashOpaqueToken(row.token),
        updatedAt: new Date(),
      })
      .where(eq(businessMemberInvites.id, row.id));
  }

  return rows.length;
}

async function backfillGoogleCalendarTokens() {
  const rows = await db
    .select({
      accessToken: googleCalendarConnections.accessToken,
      id: googleCalendarConnections.id,
      refreshToken: googleCalendarConnections.refreshToken,
    })
    .from(googleCalendarConnections)
    .where(
      or(
        isNotNull(googleCalendarConnections.accessToken),
        isNotNull(googleCalendarConnections.refreshToken),
      ),
    );

  for (const row of rows) {
    await db
      .update(googleCalendarConnections)
      .set({
        accessToken: null,
        accessTokenEncrypted: row.accessToken
          ? encryptValue(row.accessToken)
          : null,
        refreshToken: null,
        refreshTokenEncrypted: row.refreshToken
          ? encryptValue(row.refreshToken)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, row.id));
  }

  return rows.length;
}

async function main() {
  const [quoteCount, inviteCount, calendarCount] = await Promise.all([
    backfillQuotePublicTokens(),
    backfillBusinessInviteTokens(),
    backfillGoogleCalendarTokens(),
  ]);

  console.log("Security backfill completed.", {
    businessInvites: inviteCount,
    googleCalendarConnections: calendarCount,
    quotes: quoteCount,
  });
}

main()
  .catch((error) => {
    console.error("Security backfill failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbConnection.end();
  });
