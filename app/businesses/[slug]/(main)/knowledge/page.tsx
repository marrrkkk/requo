import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getBusinessSettingsPath,
} from "@/features/businesses/routes";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Knowledge",
  description: "Redirects to the business knowledge settings page.",
});

type KnowledgePageProps = {
  params: Promise<{ slug: string }>;
};

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
};

export default async function KnowledgePage({ params }: KnowledgePageProps) {
  const { slug } = await params;
  const { businessContext } = await getAppShellContext(slug);

  redirect(getBusinessSettingsPath(businessContext.business.slug, "knowledge"));
}
