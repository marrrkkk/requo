import { redirect } from "next/navigation";
import { Suspense } from "react";

type Props = { params: Promise<{ businessSlug: string }> };

export const instant = true;

/**
 * Legacy AI assistant settings — redirect to new location.
 *
 * Sync shell so sibling navigation paints instantly; params await
 * lives in the Suspense child.
 */
export default function AiAssistantRedirectPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <AiAssistantRedirect params={params} />
    </Suspense>
  );
}

async function AiAssistantRedirect({ params }: Props): Promise<never> {
  const { businessSlug } = await params;
  redirect(`/${businessSlug}/settings/ai`);
}
