import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24; // 24 hours

function getSigningKey(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for admin session signing.");
  }

  return new TextEncoder().encode(secret);
}

/**
 * Validate admin credentials against env vars.
 * Returns true if username and password match `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
 */
export function validateAdminCredentials(
  username: string,
  password: string,
): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  return username === expectedUsername && password === expectedPassword;
}

/**
 * Create an admin session by signing a JWT and setting it as an httpOnly cookie.
 */
export async function createAdminSession(): Promise<void> {
  const key = getSigningKey();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION_SECONDS)
    .sign(key);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Verify the admin session cookie. Returns true if a valid, non-expired
 * JWT is present.
 */
export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  try {
    const key = getSigningKey();
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Destroy the admin session by deleting the cookie.
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
