import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo/site";

export async function GET() {
  const origin = getSiteUrl().origin;

  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/api/auth/signin`,
      token_endpoint: `${origin}/api/auth/token`,
      jwks_uri: `${origin}/api/auth/jwks`,
      grant_types_supported: ["authorization_code", "client_credentials"],
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
