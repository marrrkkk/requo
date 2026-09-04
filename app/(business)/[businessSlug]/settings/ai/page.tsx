import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { SettingsFormBodySkeleton } from "@/components/shell/settings-body-skeletons";
import { getBusinessPublicChatPath } from "@/features/businesses/routes";
import { updateBusinessAiAgentSettingsAction } from "@/features/settings/actions";
import { BusinessAiAgentSettingsForm } from "@/features/settings/components/business-ai-agent-settings-form";
import { getBusinessSettingsForBusiness } from "@/features/settings/queries";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Assistant · Settings",
  description: "Configure your AI assistant for quote drafting.",
});

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

type AiSettingsPageProps = {
  params: Promise<{ businessSlug: string }>;
};

/**
 * AI assistant settings page — non-blocking structural shell.
 *
 * Returns the page header synchronously. Dynamic reads are resolved
 * inside a Suspense-wrapped child server component.
 *
 * Business knowledge base has moved to /settings/knowledge-base.
 */
export default function AiSettingsPage({ params }: AiSettingsPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Assistant"
        description="Configure how the AI assistant drafts quotes for your business."
      />
      <Suspense fallback={<SettingsFormBodySkeleton />}>
        <AiAssistantContent params={params} />
      </Suspense>
    </>
  );
}

async function AiAssistantContent({ params }: AiSettingsPageProps) {
  const { businessSlug } = await params;
  const { businessContext } = await getBusinessOperationalPageContext(businessSlug);
  const { business } = businessContext;
  const slug = business.slug;

  const settings = await getBusinessSettingsForBusiness(business.id);

  if (!settings) {
    notFound();
  }

  return (
    <BusinessAiAgentSettingsForm
      action={updateBusinessAiAgentSettingsAction}
      chatPath={getBusinessPublicChatPath(slug)}
      key={`assistant-settings-${settings.updatedAt.getTime()}`}
      settings={settings}
    />
  );
}
