import { NextResponse } from "next/server";

import { getCapacitySnapshot } from "@/lib/ai/capacity-selector";

/** Dev-only visibility into provider budgets and rolling token reservations. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev-only endpoint" }, { status: 403 });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    models: await getCapacitySnapshot(),
  });
}
