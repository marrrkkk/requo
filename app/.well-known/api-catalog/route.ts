import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo/site";

export async function GET() {
  const origin = getSiteUrl().origin;

  const linkset = [
    {
      anchor: `${origin}/api`,
      "service-desc": [
        {
          href: `${origin}/docs/openapi.json`,
          type: "application/openapi+json",
        },
      ],
      "service-doc": [
        {
          href: `${origin}/docs/api`,
          type: "text/html",
        },
      ],
      status: [
        {
          href: `${origin}/api/health`,
          type: "application/json",
        },
      ],
    },
  ];

  return NextResponse.json(
    { linkset },
    {
      status: 200,
      headers: {
        "Content-Type": "application/linkset+json",
      },
    }
  );
}
