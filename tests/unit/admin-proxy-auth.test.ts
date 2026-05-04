import { describe, expect, it, vi } from "vitest";
import { makeSignature } from "better-auth/crypto";

const { testSecret } = vi.hoisted(() => ({
  testSecret: "test-admin-proxy-secret-1234567890",
}));

vi.mock("@/lib/env", () => ({
  env: {
    ADMIN_EMAILS: "admin@example.com",
    BETTER_AUTH_SECRET: testSecret,
    NODE_ENV: "test",
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: {},
}));

import { getVerifiedBetterAuthSessionToken } from "@/features/admin/proxy-auth";

async function createSignedSessionCookie(token: string) {
  const signature = await makeSignature(token, testSecret);

  return encodeURIComponent(`${token}.${signature}`);
}

describe("admin proxy auth helpers", () => {
  it("extracts a verified Better Auth session token from the signed cookie", async () => {
    const headers = new Headers({
      cookie: `better-auth.session_token=${await createSignedSessionCookie("session_token_1")}`,
    });

    await expect(getVerifiedBetterAuthSessionToken(headers)).resolves.toBe(
      "session_token_1",
    );
  });

  it("rejects unsigned session token cookies", async () => {
    const headers = new Headers({
      cookie: "better-auth.session_token=session_token_1",
    });

    await expect(getVerifiedBetterAuthSessionToken(headers)).resolves.toBeNull();
  });

  it("rejects tampered session token cookies", async () => {
    const signedCookie = await createSignedSessionCookie("session_token_1");
    const headers = new Headers({
      cookie: `better-auth.session_token=${signedCookie.replace("1", "2")}`,
    });

    await expect(getVerifiedBetterAuthSessionToken(headers)).resolves.toBeNull();
  });
});
