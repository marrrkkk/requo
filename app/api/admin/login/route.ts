import { NextResponse } from "next/server";

import {
  createAdminSession,
  validateAdminCredentials,
} from "@/lib/admin/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password.trim()
    ) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    if (!validateAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    await createAdminSession();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
