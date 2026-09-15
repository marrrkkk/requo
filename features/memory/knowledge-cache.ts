import "server-only";

import { revalidateTag } from "next/cache";

import { getBusinessMemoryCacheTags } from "@/lib/cache/business-tags";

/**
 * Expires the cached knowledge and memory reads for a business.
 *
 * Lives in its own module so the background backfill job can reuse it without
 * pulling in the whole knowledge-processing pipeline (Supabase admin, PDF
 * extraction). Background-safe by design: it uses `revalidateTag(tag, "max")`
 * rather than `updateTag`, which is only valid inside a Server Action.
 */
export function invalidateKnowledgeCache(businessId: string) {
  for (const tag of getBusinessMemoryCacheTags(businessId)) {
    revalidateTag(tag, "max");
  }
}
