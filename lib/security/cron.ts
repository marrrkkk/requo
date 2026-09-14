import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Verifies Vercel Cron `Authorization: Bearer <CRON_SECRET>` using a
 * timing-safe comparison. Returns true only when a secret is configured
 * and the header matches exactly. Missing secret fails closed (all requests
 * rejected) so misconfiguration never opens the endpoint.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const configured = env.CRON_SECRET;

  if (!configured) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${configured}`;

  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
