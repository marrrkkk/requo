import { BellRing } from "lucide-react";

import {
  DashboardDetailFeed,
  DashboardDetailFeedItem,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/shared/dashboard-layout";
import { FollowUpCreateDialog } from "@/features/follow-ups/components/follow-up-create-dialog";
import { FollowUpItem } from "@/features/follow-ups/components/follow-up-item";
import {
  FollowUpStatusBadge,
} from "@/features/follow-ups/components/follow-up-status-badge";
import type {
  FollowUpChannel,
  FollowUpCreateActionState,
  FollowUpView,
} from "@/features/follow-ups/types";
import {
  formatFollowUpDate,
  getDefaultFollowUpChannel,
  getQuickFollowUpDueDate,
} from "@/features/follow-ups/utils";

type FollowUpCreateAction = (
  state: FollowUpCreateActionState,
  formData: FormData,
) => Promise<FollowUpCreateActionState>;

export function FollowUpPanel({
  businessSlug,
  createAction,
  ctaDescription,
  defaultChannel,
  defaultReason,
  defaultTitle,
  followUps,
  sharedQuoteWithoutFollowUp = false,
}: {
  businessSlug: string;
  createAction: FollowUpCreateAction;
  ctaDescription?: string;
  defaultChannel?: FollowUpChannel | string | null;
  defaultReason: string;
  defaultTitle: string;
  followUps: FollowUpView[];
  sharedQuoteWithoutFollowUp?: boolean;
}) {
  const pendingFollowUps = followUps.filter((followUp) => followUp.status === "pending");
  const nextFollowUp =
    pendingFollowUps
      .slice()
      .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())[0] ??
    null;
  const history = followUps.filter((followUp) => followUp.id !== nextFollowUp?.id);
  const renderCreateDialog = () => (
    <FollowUpCreateDialog
      action={createAction}
      defaultChannel={
        typeof defaultChannel === "string"
          ? getDefaultFollowUpChannel(defaultChannel)
          : defaultChannel ?? "email"
      }
      defaultDueDate={getQuickFollowUpDueDate("3d")}
      defaultReason={defaultReason}
      defaultTitle={defaultTitle}
      description={ctaDescription}
      triggerLabel={sharedQuoteWithoutFollowUp ? "Set reminder" : "Set follow-up"}
    />
  );

  return (
    <DashboardSection
      action={renderCreateDialog()}
      contentClassName="flex flex-col gap-4"
      description="Plan the next customer touchpoint so work does not go cold."
      title="Follow-ups"
    >
      {nextFollowUp ? (
        <div className="flex flex-col gap-3">
          <p className="meta-label">Next pending follow-up</p>
          <FollowUpItem
            businessSlug={businessSlug}
            followUp={nextFollowUp}
            showMessage
          />
        </div>
      ) : sharedQuoteWithoutFollowUp ? (
        <DashboardEmptyState
          action={renderCreateDialog()}
          description="Set a follow-up reminder so this quote doesn't go cold."
          icon={BellRing}
          title="Set follow-up reminder"
          variant="section"
        />
      ) : followUps.length ? null : (
        <DashboardEmptyState
          action={renderCreateDialog()}
          description="You're all caught up. Follow-ups help you remember which inquiries or quotes need attention next."
          icon={BellRing}
          title="No follow-ups"
          variant="section"
        />
      )}

      {history.length ? (
        <div className="flex flex-col gap-3">
          <p className="meta-label">Follow-up history</p>
          <DashboardDetailFeed>
            {history.slice(0, 5).map((followUp) => (
              <DashboardDetailFeedItem
                key={followUp.id}
                action={<FollowUpStatusBadge status={followUp.status} />}
                meta={
                  <>
                    <span>Due {formatFollowUpDate(followUp.dueAt)}</span>
                    <span aria-hidden="true">|</span>
                    <span>{followUp.related.label}</span>
                  </>
                }
                title={followUp.title}
              >
                <p>{followUp.reason}</p>
              </DashboardDetailFeedItem>
            ))}
          </DashboardDetailFeed>
        </div>
      ) : null}
    </DashboardSection>
  );
}
