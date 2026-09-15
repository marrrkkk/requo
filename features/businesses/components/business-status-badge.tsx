import {
  RiArchiveLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiLockLine,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import type { BusinessRecordState } from "@/features/businesses/lifecycle";
import { cn } from "@/lib/utils";

/**
 * Business lifecycle badge.
 *
 * Follows the same convention as `QuoteStatusBadge` / `InquiryStatusBadge`: a
 * per-domain class map over the Tailwind palette plus an icon and a text label.
 * Colour never carries the meaning on its own — the label always renders.
 */
const businessStatusClassNames: Record<BusinessRecordState, string> = {
  active:
    "!border-emerald-500/30 !bg-emerald-500/15 !text-emerald-800 dark:!border-emerald-500/25 dark:!bg-emerald-500/12 dark:!text-emerald-200",
  locked:
    "!border-amber-500/30 !bg-amber-500/15 !text-amber-800 dark:!border-amber-500/25 dark:!bg-amber-500/12 dark:!text-amber-200",
  archived:
    "!border-slate-500/25 !bg-slate-500/12 !text-slate-800 dark:!border-slate-500/25 dark:!bg-slate-500/12 dark:!text-slate-200",
  trash:
    "!border-red-500/30 !bg-red-500/15 !text-red-800 dark:!border-red-500/25 dark:!bg-red-500/12 dark:!text-red-200",
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
  const Icon = businessStatusIcons[status];

  return (
    <Badge
      className={cn(
        "shrink-0 rounded-full",
        businessStatusClassNames[status],
        className,
      )}
      variant="secondary"
    >
      <Icon data-icon="inline-start" aria-hidden />
      {businessStatusLabels[status]}
    </Badge>
  );
}
