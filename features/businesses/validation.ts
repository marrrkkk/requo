import { isReservedRouteSegment } from "@/lib/routing/reserved-segments";
import { publicSlugRegex } from "@/lib/slugs";

export function validateBusinessSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  if (!publicSlugRegex.test(slug)) {
    return {
      valid: false,
      error: "Slug must contain only lowercase letters, numbers, and hyphens.",
    };
  }
  if (isReservedRouteSegment(slug)) {
    return {
      valid: false,
      error: "This slug is unavailable — it conflicts with a system route.",
    };
  }
  return { valid: true };
}
