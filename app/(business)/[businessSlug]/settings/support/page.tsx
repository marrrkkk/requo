import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, CircleHelp, ExternalLink, Mail, MessageCircle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CrispChatWidgetServer } from "@/components/integrations/crisp/crisp-chat-widget-server";
import { SupportChatActions } from "@/features/settings/components/support-chat-actions";
import { legalConfig } from "@/features/legal/config";
import { env } from "@/lib/env";
import { createNoIndexMetadata } from "@/lib/seo/site";
import { getBusinessOperationalPageContext } from "../_lib/page-context";

const supportLinks = [
  {
    label: "Documentation",
    href: "https://docs.crisp.chat",
    icon: BookOpen,
  },
  {
    label: "FAQ",
    href: "/#faq",
    icon: CircleHelp,
  },
  {
    label: "Contact support",
    href: `mailto:${legalConfig.supportEmail}`,
    icon: Mail,
  },
] as const;

export const metadata: Metadata = createNoIndexMetadata({
  title: "Support",
  description: "Get help with onboarding, billing, troubleshooting, and product usage.",
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

/**
 * Support settings page — non-blocking structural shell.
 *
 * Returns the page content synchronously. The auth gate
 * (getBusinessOperationalPageContext) is resolved inside a
 * Suspense-wrapped child server component that redirects
 * unauthorized users without blocking the shell render.
 */
export default function BusinessSupportSettingsPage() {
  const crispEnabled = Boolean(env.CRISP_WEBSITE_ID);

  return (
    <>
      {/* Auth gate — redirects unauthorized users once resolved */}
      <Suspense fallback={null}>
        <SupportAuthGate />
      </Suspense>

      <PageHeader
        eyebrow="Business"
        title="Support"
        description="Need help with setup, quoting workflows, billing, or troubleshooting? Reach us by chat or email and we will help you move forward quickly."
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Alert>
          <MessageCircle />
          <AlertTitle>How to contact support</AlertTitle>
          <AlertDescription>
            Use live chat for quick questions and workflow guidance. For account-specific
            issues, billing clarifications, or sensitive details, email our support inbox.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Live support</CardTitle>
              <Badge variant={crispEnabled ? "secondary" : "outline"}>
                {crispEnabled ? "Chat available" : "Chat setup needed"}
              </Badge>
            </div>
            <CardDescription>
              Chat is available on marketing pages and can be opened here for in-app support.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SupportChatActions crispEnabled={crispEnabled} />
            <Separator />
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Availability:</span> Monday-Friday,
                9:00 AM-6:00 PM (UTC)
              </p>
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                <Link className="underline underline-offset-4" href={`mailto:${legalConfig.supportEmail}`}>
                  {legalConfig.supportEmail}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Helpful links</CardTitle>
            <CardDescription>
              Browse setup guides, FAQs, and contact channels for faster resolution.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {supportLinks.map((link) => {
              const Icon = link.icon;
              const isExternal = link.href.startsWith("http");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className="control-item flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5 transition-colors hover:border-primary/30"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="size-4 text-muted-foreground" />
                    {link.label}
                  </span>
                  {isExternal ? (
                    <ExternalLink className="size-4 text-muted-foreground" />
                  ) : null}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <CrispChatWidgetServer />
    </>
  );
}

/**
 * Auth gate component — resolves the business operational page context.
 * Redirects unauthorized users; renders nothing on success.
 */
async function SupportAuthGate() {
  await getBusinessOperationalPageContext();
  return null;
}
