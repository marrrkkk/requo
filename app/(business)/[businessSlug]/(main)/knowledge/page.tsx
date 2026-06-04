import type { Metadata } from "next";
import { Suspense } from "react";
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
  params: Promise<{ businessSlug: string }>;
};

export const unstable_instant = {
  prefetch: "static",
  samples: [
    {
      params: { businessSlug: "demo" },
      headers: [
        ["rsc", "1"],
        ["next-action", null],
      ],
    },
  ],
};

/**
 * Knowledge page — returns null synchronously and redirects from a Suspense child.
 *
 * The redirect is a dynamic read (requires session + business context),
 * so it lives inside a Suspense-wrapped child server component.
 */
export default function KnowledgePage({ params }: KnowledgePageProps) {
  return (
    <Suspense fallback={null}>
      <KnowledgeRedirect params={params} />
    </Suspense>
  );
}

async function KnowledgeRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await getAppShellContext(businessSlug);

  redirect(getBusinessSettingsPath(businessContext.business.slug, "knowledge"));

  // Unreachable — redirect() throws; this satisfies TypeScript's JSX component type
  return null;
}
