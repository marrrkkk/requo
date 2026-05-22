import { NextResponse, type NextRequest } from "next/server";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug || slug.trim().length < 2) {
    return NextResponse.json({ available: false });
  }

  const [existing] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, slug.trim()))
    .limit(1);

  return NextResponse.json({ available: !existing });
}
