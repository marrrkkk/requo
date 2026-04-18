import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Inbox,
  ReceiptText,
} from "lucide-react";

import {
  DashboardActionsRow,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyPublicInquiryLinkButton } from "@/features/businesses/components/copy-public-inquiry-link-button";

type DashboardActivationChecklistProps = {
  businessName: string;
  publicInquiryEnabled: boolean;
  publicInquiryUrl: string;
  inquiriesPath: string;
  newQuotePath: string;
  totalInquiries: number;
  totalQuotes: number;
};

export function DashboardActivationChecklist({
  businessName,
  publicInquiryEnabled,
  publicInquiryUrl,
  inquiriesPath,
  newQuotePath,
  totalInquiries,
  totalQuotes,
}: DashboardActivationChecklistProps) {
  const checklistItems = [
    {
      id: "workspace",
      title: "Workspace and business are ready",
      detail: "Your first workspace and business are already set up.",
      complete: true,
    },
    {
      id: "form",
      title: publicInquiryEnabled ? "Inquiry form is live" : "Publish inquiry form",
      detail: publicInquiryEnabled
        ? "You can preview it now or copy the public link to share it."
        : "Publish your inquiry form so customers can start sending requests.",
      complete: publicInquiryEnabled,
    },
    {
      id: "inquiry",
      title: totalInquiries > 0 ? "First inquiry received" : "Collect your first inquiry",
      detail:
        totalInquiries > 0
          ? `${totalInquiries} ${totalInquiries === 1 ? "inquiry is" : "inquiries are"} already in the inbox.`
          : "Send yourself a test request or share the public link with customers.",
      complete: totalInquiries > 0,
    },
    {
      id: "quote",
      title: totalQuotes > 0 ? "First quote created" : "Create your first quote",
      detail:
        totalQuotes > 0
          ? `${totalQuotes} ${totalQuotes === 1 ? "quote is" : "quotes are"} already in progress.`
          : "Use the quote editor to send a first price or proposal from Requo.",
      complete: totalQuotes > 0,
    },
  ];
  const remainingSteps = checklistItems.filter((item) => !item.complete).length;

  return (
    <DashboardSection
      action={
        <Badge variant="secondary">
          {remainingSteps === 0
            ? "Activated"
            : `${remainingSteps} step${remainingSteps === 1 ? "" : "s"} left`}
        </Badge>
      }
      description={`Your intake flow for ${businessName} is ready. Use these next actions to start collecting inquiries and sending quotes.`}
      footer={
        <DashboardActionsRow>
          <Button asChild variant="outline">
            <Link href={publicInquiryUrl} prefetch={false} rel="noreferrer" target="_blank">
              Preview inquiry page
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
          <CopyPublicInquiryLinkButton url={publicInquiryUrl} />
          <Button asChild variant="secondary">
            <Link href={inquiriesPath} prefetch={true}>
              <Inbox data-icon="inline-start" />
              Open inquiries
            </Link>
          </Button>
          <Button asChild>
            <Link href={newQuotePath} prefetch={true}>
              <ReceiptText data-icon="inline-start" />
              Create first quote
            </Link>
          </Button>
        </DashboardActionsRow>
      }
      title="Get your workflow live"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {checklistItems.map((item) => (
          <div className="soft-panel flex items-start gap-3 px-4 py-4" key={item.id}>
            <span
              aria-hidden="true"
              className={
                item.complete
                  ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  : "flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
              }
            >
              {item.complete ? <CheckCircle2 /> : <CircleDashed />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
