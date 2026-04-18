import "server-only";

import { createHmac } from "node:crypto";

import { env } from "@/lib/env";

function getTokenHashSecret() {
  return env.APP_TOKEN_HASH_SECRET ?? env.BETTER_AUTH_SECRET;
}

export function hashOpaqueToken(token: string) {
  return createHmac("sha256", getTokenHashSecret())
    .update(token)
    .digest("base64url");
}
