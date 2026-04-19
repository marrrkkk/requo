import { headers } from "next/headers";
import { connection } from "next/server";

import {
  changeAccountPasswordAction,
  deleteAccountAction,
  revokeAccountSessionAction,
  revokeAllAccountSessionsAction,
  revokeOtherSessionsAction,
  setAccountPasswordAction,
} from "@/features/account/actions";
import { SecuritySettingsForm } from "@/features/account/components/security-settings-form";
import { getAccountSecurityForUser } from "@/features/account/queries";
import type { AccountSessionView } from "@/features/account/types";
import { requireSession } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";

export default async function AccountSecurityPage() {
  await connection();

  const session = await requireSession();
  const user = session.user;
  const [security, sessions] = await Promise.all([
    getAccountSecurityForUser(user.id, user.email),
    auth.api.listSessions({
      headers: await headers(),
    }),
  ]);

  return (
    <SecuritySettingsForm
      changePasswordAction={changeAccountPasswordAction}
      deleteAccountAction={deleteAccountAction}
      revokeAllSessionsAction={revokeAllAccountSessionsAction}
      revokeSessionAction={revokeAccountSessionAction}
      revokeOtherSessionsAction={revokeOtherSessionsAction}
      security={{
        ...security,
        activeSessionCount: sessions.length,
        activeSessions: sessions.map((session, index) =>
          toAccountSessionView(session, index),
        ),
      }}
      setPasswordAction={setAccountPasswordAction}
    />
  );
}

function toAccountSessionView(
  session: Awaited<ReturnType<typeof auth.api.listSessions>>[number],
  index: number,
): AccountSessionView {
  return {
    id: readOptionalString(session, "id") ?? `session-${index}`,
    token: readOptionalString(session, "token"),
    userAgent: readOptionalString(session, "userAgent"),
    ipAddress: readOptionalString(session, "ipAddress"),
    createdAt: toIsoString(readOptionalDate(session, "createdAt")),
    updatedAt: toIsoString(readOptionalDate(session, "updatedAt")),
    expiresAt: toIsoString(readOptionalDate(session, "expiresAt")),
    isCurrent: readOptionalBoolean(session, "isCurrent") ?? false,
  };
}

function readOptionalString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const candidate = value[key];

  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : null;
}

function readOptionalDate(
  value: Record<string, unknown>,
  key: string,
): Date | string | null {
  const candidate = value[key];

  return candidate instanceof Date || typeof candidate === "string"
    ? candidate
    : null;
}

function readOptionalBoolean(
  value: Record<string, unknown>,
  key: string,
): boolean | null {
  const candidate = value[key];

  return typeof candidate === "boolean" ? candidate : null;
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.toISOString();
}
