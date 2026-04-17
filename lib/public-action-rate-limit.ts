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

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function getForwardedIpAddress(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  return headerValue
    .split(",")
    .map((segment) => segment.trim())
    .find(Boolean);
}

async function getPublicActionFingerprint(scope: string) {
  const headerStore = await headers();
  const ipAddress =
    getForwardedIpAddress(headerStore.get("x-forwarded-for")) ??
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-real-ip") ??
    "unknown";
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
}
