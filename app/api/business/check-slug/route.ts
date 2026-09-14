import { NextResponse, type NextRequest } from "next/server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { businesses } from "@/lib/db/schema";
import { getOptionalSession } from "@/lib/auth/session";

const slugQuerySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
});

export async function GET(request: NextRequest) {
  // Availability checks run during authenticated business creation.
  // Require a session so anonymous callers cannot oracle slug existence.
  const session = await getOptionalSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = slugQuerySchema.safeParse({
    slug: request.nextUrl.searchParams.get("slug"),
  });

  if (!parsed.success) {
    return NextResponse.json({ available: false });
  }

  const [existing] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, parsed.data.slug))
    .limit(1);

  return NextResponse.json({ available: !existing });
}
