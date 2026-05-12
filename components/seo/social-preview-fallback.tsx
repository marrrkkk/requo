import "server-only";

import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";

import {
  socialImageContentType,
  socialImageSize,
  SocialPreviewImage,
  type SocialPreviewImageProps,
} from "@/components/seo/social-preview-image";

/**
 * Memoised buffer read for the static `public/og/fallback.png`. Route modules
 * cannot `await` at the top level, so we start the read once at module load
 * and cache the promise. Every OG / Twitter route in the tree reuses the same
 * buffer without re-reading the file per request.
 *
 * The fallback PNG is produced in task 7.3. Before that file is committed
 * (and in any environment where it is missing), `loadFallbackBytes()` returns
 * `null` and callers fall back to a minimal inline `ImageResponse` so this
 * task does not hard-depend on the asset being present.
 */
let fallbackBytesPromise: Promise<Buffer | null> | null = null;

function loadFallbackBytes(): Promise<Buffer | null> {
  if (!fallbackBytesPromise) {
    fallbackBytesPromise = fs
      .readFile(path.join(process.cwd(), "public", "og", "fallback.png"))
      .then((buffer) => buffer)
      .catch(() => {
        // Reset so a later call can retry once the file is added (task 7.3).
        fallbackBytesPromise = null;
        return null;
      });
  }

  return fallbackBytesPromise;
}

function renderInlineFallback(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(135deg, #f7f4ee 0%, #ffffff 48%, #e7eefc 100%)",
          color: "#172033",
          display: "flex",
          fontSize: 144,
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.06em",
          width: "100%",
        }}
      >
        Requo
      </div>
    ),
    { ...socialImageSize },
  );
}

/**
 * Returns the static fallback PNG as a plain `Response`, or an inline
 * `ImageResponse` when the static file is unavailable. Used by per-route
 * `opengraph-image.tsx` / `twitter-image.tsx` modules when dynamic rendering
 * throws (Requirement 7.5).
 */
export async function socialPreviewFallbackResponse(): Promise<Response> {
  const bytes = await loadFallbackBytes();

  if (bytes) {
    return new Response(new Uint8Array(bytes), {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=3600",
        "content-type": socialImageContentType,
      },
    });
  }

  return renderInlineFallback();
}

/**
 * Renders a per-route social preview inside a try/catch, falling back to the
 * static OG bytes (or an inline `ImageResponse`) on any render error. Callers
 * co-located in `app/**` route segments only need to supply the title,
 * subtitle, and body overrides that are specific to that segment.
 */
export async function renderSocialPreview(
  props: SocialPreviewImageProps = {},
): Promise<Response> {
  try {
    return new ImageResponse(<SocialPreviewImage {...props} />, {
      ...socialImageSize,
    });
  } catch (error) {
    console.error("social-preview-render-failed", error);
    return socialPreviewFallbackResponse();
  }
}
