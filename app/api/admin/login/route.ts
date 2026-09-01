import { NextResponse } from "next/server";

/**
 * @deprecated This endpoint has been removed. Admin login now uses
 * Better Auth's standard `/api/auth/sign-in/email` flow. Admin access
 * is gated by `user.role === "admin"` in the Better Auth session.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been removed. Please use the standard login flow.",
    },
    { status: 410 },
  );
}
