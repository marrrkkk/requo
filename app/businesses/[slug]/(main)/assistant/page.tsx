import type { Metadata } from "next";

import { AssistantFullPage } from "@/features/ai/components/assistant-full-page";
import { getAppShellContext } from "@/lib/app-shell/context";
import { createNoIndexMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Assistant",
  description: "Ask questions about your business data, inquiries, quotes, and follow-ups.",
});

type AssistantPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AssistantPage({ params }: AssistantPageProps) {
  const { slug } = await params;
  const { user, businessContext } = await getAppShellContext(slug);

  return (
    <div className="relative flex-1 -mx-3 -my-5 sm:-mx-6 sm:-my-7 xl:-mx-8 xl:-my-8">
      <div className="absolute inset-0 flex flex-col">
        <AssistantFullPage
          businessSlug={businessContext.business.slug}
          plan={businessContext.business.plan}
          userName={user.name || "You"}
        />
      </div>
    </div>
  );
}
