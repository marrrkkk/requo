import { NextResponse } from "next/server";

import { destroyAdminSession } from "@/lib/admin/auth";

export async function POST() {
  try {
    await destroyAdminSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
