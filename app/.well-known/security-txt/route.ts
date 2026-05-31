import { NextResponse } from "next/server";

export async function GET() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const body = [
    "Contact: mailto:security@requo.app",
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    "Policy: https://requo.app/security#vulnerability-disclosure",
  ].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
