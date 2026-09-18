import {
  RiArchiveLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiLockLine,
} from "@remixicon/react";

import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import type { BusinessRecordState } from "@/features/businesses/lifecycle";

/**
 * Business lifecycle badge.
 *
 * Follows the shared status convention (`components/shared/status-badge`): a
 * semantic tone, an icon, and an always-rendered text label. Colour never
 * carries the meaning on its own — the label always renders.
 */
const businessStatusTones: Record<BusinessRecordState, StatusTone> = {
  active: "success",
  locked: "warning",
  archived: "neutral",
  trash: "danger",
};

const businessStatusLabels: Record<BusinessRecordState, string> = {
  active: "Active",
  locked: "Locked",
  archived: "Archived",
  trash: "Deleted",
};

const businessStatusIcons = {
  active: RiCheckboxCircleLine,
  locked: RiLockLine,
  archived: RiArchiveLine,
  trash: RiDeleteBinLine,
} as const;

export function BusinessStatusBadge({
  status,
  className,
}: {
  status: BusinessRecordState;
  className?: string;
}) {
  return (
    <StatusBadge
      tone={businessStatusTones[status]}
      label={businessStatusLabels[status]}
      icon={businessStatusIcons[status]}
      className={className}
    />
  );
}
