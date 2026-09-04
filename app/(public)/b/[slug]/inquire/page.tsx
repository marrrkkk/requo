import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Bot, FileText } from "lucide-react";

import { getPublicAgentBusiness } from "@/features/ai-agent/queries";
import { getBusinessPublicChatPath } from "@/features/businesses/routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicAgentBusiness(slug);
  if (!business) return { title: "Inquire" };
  return {
    title: `Get in touch with ${business.name}`,
    description: business.shortDescription ?? `Contact ${business.name} to get started.`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicInquireHubPage({ params }: Props) {
  const { slug } = await params;
  const business = await getPublicAgentBusiness(slug);

  if (!business) notFound();

  const chatHref = getBusinessPublicChatPath(slug);
  const formHref = `/inquire/${slug}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{business.name}</h1>
          {business.shortDescription ? (
            <p className="text-sm text-muted-foreground">{business.shortDescription}</p>
          ) : null}
          <p className="text-base text-foreground/80">How would you like to get in touch?</p>
        </div>

        {/* Options */}
        <div className={business.aiAgentEnabled ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "flex justify-center"}>
          {business.aiAgentEnabled ? (
            <Link
              href={chatHref}
              className="group flex flex-col items-center gap-4 rounded-xl border border-border/70 bg-card p-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Chat with us</p>
                <p className="text-xs text-muted-foreground">Tell us what you need and we&#39;ll help you get started.</p>
              </div>
            </Link>
          ) : null}

          <Link
            href={formHref}
            className="group flex flex-col items-center gap-4 rounded-xl border border-border/70 bg-card p-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Submit an inquiry form</p>
              <p className="text-xs text-muted-foreground">Fill in the details about what you need.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
