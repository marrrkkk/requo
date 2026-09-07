import { redirect } from "next/navigation";

type Props = { params: Promise<{ businessSlug: string }> };

/**
 * Legacy AI assistant settings — redirect to new location.
 */
export default async function AiAssistantRedirectPage({ params }: Props): Promise<never> {
  const { businessSlug } = await params;
  redirect(`/${businessSlug}/settings/ai`);
}
