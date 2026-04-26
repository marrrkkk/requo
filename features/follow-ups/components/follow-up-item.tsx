import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  completeFollowUpAction,
  rescheduleFollowUpAction,
  skipFollowUpAction,
} from "@/features/follow-ups/actions";
import { FollowUpActions } from "@/features/follow-ups/components/follow-up-actions";
import { FollowUpMessageCopyButton } from "@/features/follow-ups/components/follow-up-message-copy-button";
import {
  FollowUpDueBadge,
  FollowUpStatusBadge,
} from "@/features/follow-ups/components/follow-up-status-badge";
import type { FollowUpView } from "@/features/follow-ups/types";
import {
  formatFollowUpDate,
  getFollowUpChannelLabel,
} from "@/features/follow-ups/utils";
import {
  getBusinessInquiryPath,
  getBusinessQuotePath,
} from "@/features/businesses/routes";
import { cn } from "@/lib/utils";

export function getFollowUpRelatedHref(
  businessSlug: string,
  followUp: FollowUpView,
) {
  return followUp.related.kind === "quote"
    ? getBusinessQuotePath(businessSlug, followUp.related.id)
    : getBusinessInquiryPath(businessSlug, followUp.related.id);
}

export function FollowUpItem({
  businessSlug,
  className,
  compact = false,
  followUp,
  showMessage = true,
}: {
  businessSlug: string;
  className?: string;
  compact?: boolean;
  followUp: FollowUpView;
  showMessage?: boolean;
}) {
  const relatedHref = getFollowUpRelatedHref(businessSlug, followUp);
  const completeAction = completeFollowUpAction.bind(null, followUp.id);
  const skipAction = skipFollowUpAction.bind(null, followUp.id);
  const rescheduleAction = rescheduleFollowUpAction.bind(null, followUp.id);

  return (
    <div
      className={cn(
        "soft-panel flex flex-col gap-4 px-4 py-4 shadow-none",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {followUp.title}
            </p>
            <FollowUpStatusBadge status={followUp.status} />
            {followUp.status === "pending" ? (
              <FollowUpDueBadge bucket={followUp.dueBucket} />
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {followUp.reason}
          </p>
        </div>

        <Button asChild size="sm" variant="ghost">
          <Link href={relatedHref} prefetch={true}>
            Open
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{followUp.customerName}</Badge>
        <Badge variant="outline">{followUp.related.label}</Badge>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {formatFollowUpDate(followUp.dueAt)}
        </span>
        <span aria-hidden="true">|</span>
        <span>{getFollowUpChannelLabel(followUp.channel)}</span>
      </div>

      {showMessage ? (
        <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-3">
          <p className="meta-label">Suggested copy</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {followUp.suggestedMessage}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "flex flex-col gap-3",
          compact ? "sm:flex-row sm:items-center sm:justify-between" : null,
        )}
      >
        {showMessage ? (
          <FollowUpMessageCopyButton message={followUp.suggestedMessage} />
        ) : null}
        {followUp.status === "pending" ? (
          <FollowUpActions
            completeAction={completeAction}
            dueAt={followUp.dueAt}
            rescheduleAction={rescheduleAction}
            skipAction={skipAction}
          />
        ) : null}
      </div>
    </div>
  );
}
