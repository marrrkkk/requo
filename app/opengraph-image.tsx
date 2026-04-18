import { ImageResponse } from "next/og";

import {
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
  SocialPreviewImage,
} from "@/components/seo/social-preview-image";

export const alt = socialImageAlt;
export const contentType = socialImageContentType;
export const size = socialImageSize;

export default function OpenGraphImage() {
  return new ImageResponse(<SocialPreviewImage />, {
    ...size,
  });
}
