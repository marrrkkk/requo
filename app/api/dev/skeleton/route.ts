import { NextResponse } from "next/server";

/**
 * Dev-only route that returns metadata about all loading.tsx files
 * in the app directory for the skeleton debugger tool.
 * Blocked in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Dev-only endpoint" },
      { status: 403 },
    );
  }

  // Return info about skeleton/loading patterns
  // In dev, we use this to coordinate the skeleton preview overlay
  return NextResponse.json({
    enabled: true,
    message: "Use ?_skeleton=true query param to force loading states",
  });
}
