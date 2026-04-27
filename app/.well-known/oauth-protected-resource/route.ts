import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo/site";

export async function GET() {
  const origin = getSiteUrl().origin;

  return NextResponse.json(
    {
      resource: `${origin}/api`,
      authorization_servers: [origin],
      scopes_supported: ["read", "write"],
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
