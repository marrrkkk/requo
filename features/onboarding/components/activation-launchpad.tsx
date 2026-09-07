import Link from "next/link";
import {
  Check,
  CircleDashed,
  ClipboardCheck,
  FileText,
  Globe,
  Send,
} from "lucide-react";

import {
  DashboardActionsRow,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import {
  getBusinessServicesPath,
  getBusinessNewQuotePath,
} from "@/features/businesses/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBusinessDashboardSummaryData } from "@/features/businesses/queries";

type ActivationLaunchpadProps = {
  businessName: string;
  businessSlug: string;
  businessId: string;
  publicInquiryEnabled: boolean;
};

export async function ActivationLaunchpad({
  businessName,
  businessSlug,
  businessId,
  publicInquiryEnabled,
}: ActivationLaunchpadProps) {
  const summary = await getBusinessDashboardSummaryData(businessId);

  const hasInquiry = summary.totalInquiries > 0;
  const hasQuote = summary.totalQuotes > 0;

  // Launchpad is complete when first inquiry and first quote exist
  const isComplete = hasInquiry && hasQuote;

  // Don't show launchpad if activation is complete
  if (isComplete) {
    return null;
  }

  const publicInquiryPath = `/inquire/${businessSlug}`;

  const launchpadItems = [
    {
      id: "review-service",
      title: "Review your service",
      detail: "Check the default fields and customize if needed.",
      complete: true, // Service always exists after onboarding
      href: getBusinessServicesPath(businessSlug),
      icon: FileText,
    },
    {
      id: "publish-link",
      title: publicInquiryEnabled ? "Copy your public link" : "Publish your service",
      detail: publicInquiryEnabled
        ? "Share it on your website or send directly to customers."
        : "Make your service live so customers can submit inquiries.",
      complete: publicInquiryEnabled,
      href: getBusinessServicesPath(businessSlug),
      icon: Globe,
    },
    {
      id: "test-inquiry",
      title: hasInquiry ? "First inquiry received" : "Send a test inquiry",
      detail: hasInquiry
        ? `${summary.totalInquiries} ${summary.totalInquiries === 1 ? "inquiry" : "inquiries"} in your inbox.`
        : "Submit a test inquiry through your public service to see how it works.",
      complete: hasInquiry,
      href: publicInquiryEnabled
        ? publicInquiryPath
        : getBusinessServicesPath(businessSlug),
      icon: Send,
      external: publicInquiryEnabled && !hasInquiry,
    },
    {
      id: "first-quote",
      title: hasQuote ? "First quote created" : "Turn it into a quote",
      detail: hasQuote
        ? `${summary.totalQuotes} ${summary.totalQuotes === 1 ? "quote" : "quotes"} sent or in progress.`
        : hasInquiry
        ? "Create your first quote from an inquiry."
        : "You'll create a quote after receiving an inquiry.",
      complete: hasQuote,
      href: getBusinessNewQuotePath(businessSlug),
      icon: ClipboardCheck,
      disabled: !hasInquiry,
    },
  ];

  const remainingSteps = launchpadItems.filter((item) => !item.complete).length;

  return (
    <DashboardSection
      action={
        <Badge variant="secondary">
          {remainingSteps === 0
            ? "Ready to go"
            : `${remainingSteps} step${remainingSteps === 1 ? "" : "s"} left`}
        </Badge>
      }
      description={`Get ${businessName} live. Complete these steps to activate your inquiry-to-quote workflow.`}
      footer={
        publicInquiryEnabled && !hasInquiry ? (
          <DashboardActionsRow>
            <Button asChild variant="secondary">
              <Link
                href={publicInquiryPath}
                prefetch={false}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Send data-icon="inline-start" />
                Send test inquiry
              </Link>
            </Button>
            <Button asChild>
              <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
                <ClipboardCheck data-icon="inline-start" />
                Create quote
              </Link>
            </Button>
          </DashboardActionsRow>
        ) : hasInquiry && !hasQuote ? (
          <DashboardActionsRow>
            <Button asChild>
              <Link href={getBusinessNewQuotePath(businessSlug)} prefetch={true}>
                <ClipboardCheck data-icon="inline-start" />
                Create your first quote
              </Link>
            </Button>
          </DashboardActionsRow>
        ) : (
          <DashboardActionsRow>
            <Button asChild variant="secondary">
              <Link href={getBusinessServicesPath(businessSlug)} prefetch={true}>
                <Globe data-icon="inline-start" />
                View service settings
              </Link>
            </Button>
          </DashboardActionsRow>
        )
      }
      title="Get your inquiry flow live"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {launchpadItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={
                  item.complete
                    ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : "flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                }
              >
                {item.complete ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${item.disabled ? "text-muted-foreground" : "text-foreground"}`}
                >
                  {item.title}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </>
          );

          if (item.disabled) {
            return (
              <div
                data-padding="none"
                className="soft-panel flex items-start gap-3 px-4 py-4 opacity-60"
                key={item.id}
              >
                {content}
              </div>
            );
          }

          if (item.href) {
            return (
              <Link
                data-padding="none"
                href={item.href}
                key={item.id}
                prefetch={!item.external}
                {...(item.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="soft-panel group flex items-start gap-3 px-4 py-4 transition-colors hover:border-border/80 hover:bg-accent/22"
              >
                {content}
              </Link>
            );
          }

          return (
            <div data-padding="none" className="soft-panel flex items-start gap-3 px-4 py-4" key={item.id}>
              {content}
            </div>
          );
        })}
      </div>
    </DashboardSection>
  );
}
