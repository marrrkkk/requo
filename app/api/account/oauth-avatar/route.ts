import { getOptionalSession } from "@/lib/auth/session";

const allowedAvatarHosts = new Set([
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "avatars.githubusercontent.com",
]);

function isAllowedOAuthAvatarUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  const host = url.hostname.toLowerCase();

  if (allowedAvatarHosts.has(host)) {
    return true;
  }

  // Google avatar CDN can appear as *.googleusercontent.com
  if (host.endsWith(".googleusercontent.com")) {
    return true;
  }

  return false;
}

export async function GET() {
  const session = await getOptionalSession();

  if (!session?.user?.image) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const oauthImage = session.user.image;

  if (!isAllowedOAuthAvatarUrl(oauthImage)) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const upstream = await fetch(oauthImage, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      // Some avatar CDNs behave better with an explicit accept.
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.2",
    },
  });

  if (!upstream.ok) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  // Stream the body through without buffering.
  return new Response(upstream.body, {
    headers: {
      "cache-control": "private, max-age=300, stale-while-revalidate=60",
      "content-type": contentType,
      "x-content-type-options": "nosniff",
    },
  });
}

