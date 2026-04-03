import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  FolderUp,
  ShieldCheck,
} from "lucide-react";

import {
  PublicHeroSurface,
  PublicPageShell,
} from "@/components/shared/public-page-shell";
import { PublicInquiryForm } from "@/features/inquiries/components/public-inquiry-form";
import { submitPublicInquiryAction } from "@/features/inquiries/actions";
import { getPublicInquiryWorkspaceBySlug } from "@/features/inquiries/queries";
import { publicInquiryAttachmentLabel } from "@/features/inquiries/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const intakeSignals = [
  {
    title: "Clear details",
    description:
      "Share the service needed, timing, and message in one place instead of a scattered thread.",
    icon: ClipboardList,
  },
  {
    title: "Optional file upload",
    description: `Attach ${publicInquiryAttachmentLabel} when visuals or reference material help.`,
    icon: FolderUp,
  },
  {
    title: "Direct to owner",
    description:
      "Your inquiry goes into the business owner's Relay inbox without exposing private workspace data.",
    icon: ShieldCheck,
  },
];

export default async function PublicInquiryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await getPublicInquiryWorkspaceBySlug(slug);

  if (!workspace) {
    notFound();
  }

  const submitPublicInquiry = submitPublicInquiryAction.bind(null, workspace.slug);
  const pageHeadline =
    workspace.inquiryHeadline?.trim() ||
    `Tell ${workspace.name} what you need and they can review it in Relay.`;

  return (
    <PublicPageShell
      headerAction={
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Back to Relay
          </Link>
        </Button>
      }
    >
      <PublicHeroSurface className="lg:py-12">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.8fr)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="eyebrow">Public inquiry page</span>
              <div className="flex flex-col gap-4">
                <p className="meta-label">{workspace.name}</p>
                <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
                  Tell {workspace.name} what you need.
                </h1>
                <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {pageHeadline}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {intakeSignals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <Card
                    key={signal.title}
                    size="sm"
                    className="bg-background/92 shadow-none"
                  >
                    <CardHeader className="gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <CardTitle>{signal.title}</CardTitle>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {signal.description}
                        </p>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            <Card className="gap-0 bg-background/92 shadow-none">
              <CardHeader className="gap-2 pb-5">
                <CardTitle>What helps most</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  Service, timing, measurements, quantity, and any reference files.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
                {[
                  "Service type and quantity",
                  "Measurements or dimensions",
                  "Target deadline or install date",
                  "Reference artwork or photos",
                ].map((item) => (
                  <div className="soft-panel px-4 py-3 shadow-none" key={item}>
                    <p className="text-sm font-medium text-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="gap-0 border-border/75 bg-card/96 xl:sticky xl:top-6">
            <CardHeader className="gap-2 pb-5">
              <CardTitle className="text-2xl">Send inquiry</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Your request goes straight to {workspace.name}.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <PublicInquiryForm
                workspace={workspace}
                action={submitPublicInquiry}
              />
            </CardContent>
          </Card>
        </div>
      </PublicHeroSurface>
    </PublicPageShell>
  );
}
