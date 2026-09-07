import { redirect } from "next/navigation";

type Props = { params: Promise<{ businessSlug: string }> };

/**
 * Legacy AI knowledge settings — redirect to new location.
 */
export default async function AiKnowledgeRedirectPage({ params }: Props): Promise<never> {
  const { businessSlug } = await params;
  redirect(`/${businessSlug}/settings/knowledge-base`);
}
