import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Dev-only route to revalidate all cached paths.
 * Blocked in production.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Dev-only endpoint" },
      { status: 403 },
    );
  }

  revalidatePath("/", "layout");

  return NextResponse.json({ success: true, message: "All paths revalidated" });
}
