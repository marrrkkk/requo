import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { publicActionEvents } from "@/lib/db/schema";

type AssertPublicActionRateLimitInput = {
  action:
    | "business-inquiry-ai"
    | "public-inquiry-submit"
    | "public-quote-respond";
  scope: string;
  limit: number;
  windowMs: number;
};

type HeaderStore = Pick<Headers, "get">;

const zeroedIpv6Address = "0000:0000:0000:0000:0000:0000:0000:0000";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function isUsableClientIp(headerValue: string | null | undefined) {
  if (!headerValue) {
    return false;
  }

  const normalizedValue = headerValue.trim().toLowerCase();

  return Boolean(
    normalizedValue &&
      normalizedValue !== "unknown" &&
      normalizedValue !== "::" &&
      normalizedValue !== zeroedIpv6Address,
  );
}

export function getForwardedIpAddress(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  return headerValue
    .split(",")
    .map((segment) => segment.trim())
    .find(isUsableClientIp) ?? null;
}

export function getPublicActionClientIpAddress(headerStore: HeaderStore) {
  const ipAddressCandidates = [
    getForwardedIpAddress(headerStore.get("x-forwarded-for")),
    headerStore.get("cf-connecting-ip"),
    headerStore.get("x-real-ip"),
  ];

  return ipAddressCandidates.find(isUsableClientIp) ?? "unknown";
}

async function getPublicActionFingerprint(scope: string) {
  const headerStore = await headers();
  const ipAddress = getPublicActionClientIpAddress(headerStore);
  const userAgent = headerStore.get("user-agent") ?? "unknown";

  return createHash("sha256")
    .update(`${scope}:${ipAddress}:${userAgent}`)
    .digest("hex");
}

export async function assertPublicActionRateLimit({
  action,
  scope,
  limit,
  windowMs,
}: AssertPublicActionRateLimitInput) {
  const key = await getPublicActionFingerprint(scope);
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    const [countRow] = await db
      .select({
        count: count(),
      })
      .from(publicActionEvents)
      .where(
        and(
          eq(publicActionEvents.action, action),
          eq(publicActionEvents.key, key),
          gte(publicActionEvents.createdAt, windowStart),
        ),
      );

    if (Number(countRow?.count ?? 0) >= limit) {
      return false;
    }

    await db.insert(publicActionEvents).values({
      id: createId("pae"),
      action,
      key,
      createdAt: now,
    });

    return true;
  } catch (error) {
    console.error(
      "Failed to check public action rate limit. Allowing the request to proceed.",
      error,
    );

    return true;
  }
}
