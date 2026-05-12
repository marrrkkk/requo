import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  SocialPreviewImage,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from "@/components/seo/social-preview-image";

export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = socialImageContentType;

let fallbackBytes: Buffer | null = null;
try {
  fallbackBytes = readFileSync(join(process.cwd(), "public/og/fallback.png"));
} catch {
  fallbackBytes = null;
}

export default async function TwitterImage() {
  try {
    return new ImageResponse(<SocialPreviewImage />, {
      ...size,
    });
  } catch {
    if (fallbackBytes) {
      return new Response(new Uint8Array(fallbackBytes), {
        headers: { "content-type": contentType },
      });
    }
    throw new Error(
      "Failed to render social preview and no fallback image available",
    );
  }
}
