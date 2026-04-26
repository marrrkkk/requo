import { Badge } from "@/components/ui/badge";
import type { FollowUpDueBucket, FollowUpStatus } from "@/features/follow-ups/types";
import {
  getFollowUpDueBucketLabel,
  getFollowUpStatusLabel,
} from "@/features/follow-ups/utils";

export function FollowUpStatusBadge({
  status,
}: {
  status: FollowUpStatus;
}) {
  return (
    <Badge
      className="shrink-0 rounded-full"
      variant={
        status === "completed"
          ? "default"
          : status === "skipped"
            ? "outline"
            : "secondary"
      }
    >
      {getFollowUpStatusLabel(status)}
    </Badge>
  );
}

export function FollowUpDueBadge({
  bucket,
}: {
  bucket: FollowUpDueBucket;
}) {
  return (
    <Badge
      className="shrink-0 rounded-full"
      variant={
        bucket === "overdue"
          ? "destructive"
          : bucket === "today"
            ? "default"
            : "outline"
      }
    >
      {getFollowUpDueBucketLabel(bucket)}
    </Badge>
  );
}
