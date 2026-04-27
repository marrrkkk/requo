import { NextResponse } from "next/server";
import { siteName, siteDescription } from "@/lib/seo/site";

export async function GET() {
  return NextResponse.json(
    {
      serverInfo: {
        name: siteName,
        version: "1.0.0",
        description: siteDescription,
      },
      transport: {
        type: "sse",
        endpoint: "/api/mcp/sse",
      },
      capabilities: {
        resources: { subscribe: true },
        tools: { listChanged: true },
      },
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
