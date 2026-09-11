import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getBusinessAiSettingsPath } from "@/features/businesses/routes";

type Props = { params: Promise<{ businessSlug: string }> };

export const instant = true;

/**
 * Legacy AI agent settings — 301 redirect to new AI settings location.
 *
 * Sync shell so sibling navigation paints instantly; the params await
 * lives in the Suspense child like settings/page.tsx.
 */
export default function LegacyAgentSettingsPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <LegacyAgentRedirect params={params} />
    </Suspense>
  );
}

async function LegacyAgentRedirect({ params }: Props): Promise<never> {
  const { businessSlug } = await params;
  redirect(getBusinessAiSettingsPath(businessSlug));
}
