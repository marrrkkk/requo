import { NextResponse } from "next/server";

/**
 * @deprecated This endpoint has been removed. Admin logout now uses
 * Better Auth's standard `/api/auth/sign-out` flow.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been removed. Please use the standard logout flow.",
    },
    { status: 410 },
  );
}
