import { redirect } from "next/navigation";
import { getBusinessAiSettingsPath } from "@/features/businesses/routes";

type Props = { params: Promise<{ businessSlug: string }> };

/**
 * Legacy AI agent settings — 301 redirect to new AI settings location.
 */
export default async function LegacyAgentSettingsPage({ params }: Props): Promise<never> {
  const { businessSlug } = await params;
  redirect(getBusinessAiSettingsPath(businessSlug));
}
