import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  SocialPreviewImage,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from "@/components/seo/social-preview-image";
import { siteDescription } from "@/lib/seo/site";
import { getPublicBusinessProfileBySlug } from "@/features/businesses/queries";

export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = socialImageContentType;

let fallbackBytes: Buffer | null = null;
try {
  fallbackBytes = readFileSync(join(process.cwd(), "public/og/fallback.png"));
} catch {
  fallbackBytes = null;
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const business = await getPublicBusinessProfileBySlug(slug);

    const element =
      business && business.isPublic ? (
        <SocialPreviewImage
          title={business.name}
          subtitle="Service inquiries and quotes"
          body={business.description ?? business.shortDescription ?? siteDescription}
        />
      ) : (
        <SocialPreviewImage />
      );

    return new ImageResponse(element, { ...size });
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
