import { StatusBadge } from "@/components/shared/status-badge";
import type {
  FollowUpDueBucket,
  FollowUpSendMode,
  FollowUpStatus,
} from "@/features/follow-ups/types";
import {
  followUpDueBucketTones,
  followUpSendModeTones,
  followUpStatusTones,
  getFollowUpDueBucketLabel,
  getFollowUpSendModeLabel,
  getFollowUpStatusLabel,
} from "@/features/follow-ups/utils";

export function FollowUpStatusBadge({
  status,
  className,
}: {
  status: FollowUpStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={followUpStatusTones[status]}
      label={getFollowUpStatusLabel(status)}
      className={className}
    />
  );
}

export function FollowUpDueBadge({
  bucket,
  className,
}: {
  bucket: FollowUpDueBucket;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={followUpDueBucketTones[bucket]}
      label={getFollowUpDueBucketLabel(bucket)}
      className={className}
    />
  );
}

export function FollowUpSendModeBadge({
  sendMode,
  className,
}: {
  sendMode: FollowUpSendMode;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={followUpSendModeTones[sendMode]}
      label={getFollowUpSendModeLabel(sendMode)}
      className={className}
    />
  );
}
