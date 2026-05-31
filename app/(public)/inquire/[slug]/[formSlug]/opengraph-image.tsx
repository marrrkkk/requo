import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  SocialPreviewImage,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from "@/components/seo/social-preview-image";
import { getPublicInquiryPageDescription } from "@/features/inquiries/metadata";
import { getPublicInquiryBusinessByFormSlug } from "@/features/inquiries/queries";

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
  params: Promise<{ slug: string; formSlug: string }>;
}) {
  try {
    const { formSlug, slug } = await params;
    const business = await getPublicInquiryBusinessByFormSlug({
      businessSlug: slug,
      formSlug,
    });

    const element =
      business ? (
        <SocialPreviewImage
          title={business.form.name}
          subtitle={business.name}
          body={getPublicInquiryPageDescription(business)}
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
