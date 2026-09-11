import { redirect } from "next/navigation";
import { Suspense } from "react";

type Props = { params: Promise<{ businessSlug: string }> };

export const instant = true;

/**
 * Legacy AI knowledge settings — redirect to the Knowledge base tab.
 *
 * Sync shell so sibling navigation paints instantly; params await
 * lives in the Suspense child.
 */
export default function AiKnowledgeRedirectPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <AiKnowledgeRedirect params={params} />
    </Suspense>
  );
}

async function AiKnowledgeRedirect({ params }: Props): Promise<never> {
  const { businessSlug } = await params;
  redirect(`/${businessSlug}/settings/ai#knowledge`);
}
