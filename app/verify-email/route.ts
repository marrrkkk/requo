import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", requestUrl));
  }

  const verificationUrl = new URL("/api/auth/verify-email", requestUrl);

  verificationUrl.search = requestUrl.search;

  return NextResponse.redirect(verificationUrl);
}
