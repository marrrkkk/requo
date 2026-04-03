import type { ReactNode } from "react";
import { Globe2, Inbox, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OverviewHeroCardProps = {
  workspaceName: string;
  publicInquiryEnabled: boolean;
  newInquiryCount: number;
  quoteAttentionCount: number;
  actions: ReactNode;
};

export function OverviewHeroCard({
  workspaceName,
  publicInquiryEnabled,
  newInquiryCount,
  quoteAttentionCount,
  actions,
}: OverviewHeroCardProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card">
      <CardHeader className="gap-4 border-b border-border/70 bg-background/70">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Overview</Badge>
          <Badge variant={publicInquiryEnabled ? "secondary" : "outline"}>
            {publicInquiryEnabled ? "Public intake live" : "Public intake paused"}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          <CardTitle className="text-3xl sm:text-4xl">
            Action center for {workspaceName}
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-7">
            Start with the work that needs a reply, pricing, or follow-up. The
            overview keeps the next owner actions visible without making the page
            feel like a reporting dashboard.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-3">
          <p className="meta-label">Primary actions</p>
          <div className="flex flex-wrap gap-3">{actions}</div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/80 bg-background/75 p-4">
          <HeroSummaryItem
            icon={Inbox}
            label="New inquiries"
            value={`${newInquiryCount}`}
            description="Need triage or a first reply."
          />
          <HeroSummaryItem
            icon={ReceiptText}
            label="Quote follow-up"
            value={`${quoteAttentionCount}`}
            description="Draft, sent, or expired quotes to review."
          />
          <HeroSummaryItem
            icon={Globe2}
            label="Public form"
            value={publicInquiryEnabled ? "Live" : "Off"}
            description="Customers can submit directly into the workspace."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HeroSummaryItem({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="meta-label">{label}</p>
        <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
