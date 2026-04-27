import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo/site";

export async function GET() {
  const origin = getSiteUrl().origin;

  return NextResponse.json(
    {
      $schema: "https://agentskills.io/schema/v0.2.0/index.json",
      skills: [
        {
          name: "inquiry_submission",
          type: "openapi",
          description: "Submit a new service inquiry on behalf of a user.",
          url: `${origin}/docs/openapi.json`,
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
      ],
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
