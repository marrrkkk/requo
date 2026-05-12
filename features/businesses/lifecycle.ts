import { and, isNotNull, isNull, sql } from "drizzle-orm";

import { businesses } from "@/lib/db/schema";

export const businessRecordStates = [
  "active",
  "locked",
  "archived",
  "trash",
] as const;

export type BusinessRecordState = (typeof businessRecordStates)[number];
export type BusinessRecordView = BusinessRecordState;

export const getBusinessRecordState = sql<BusinessRecordState>`case
  when ${businesses.deletedAt} is not null then 'trash'
  when ${businesses.lockedAt} is not null then 'locked'
  when ${businesses.archivedAt} is not null then 'archived'
  else 'active'
end`;

export function getNonDeletedBusinessCondition() {
  return isNull(businesses.deletedAt);
}

export function getOperationalBusinessCondition() {
  return and(
    isNull(businesses.deletedAt),
    isNull(businesses.lockedAt),
    isNull(businesses.archivedAt),
  );
}

export function getBusinessViewCondition(view: BusinessRecordView) {
  switch (view) {
    case "locked":
      return and(
        isNull(businesses.deletedAt),
        isNotNull(businesses.lockedAt),
      );
    case "archived":
      return and(isNull(businesses.deletedAt), isNotNull(businesses.archivedAt));
    case "trash":
      return isNotNull(businesses.deletedAt);
    case "active":
    default:
      return and(
        isNull(businesses.deletedAt),
        isNull(businesses.lockedAt),
        isNull(businesses.archivedAt),
      );
  }
}

export function getBusinessRecordStateValue({
  lockedAt,
  archivedAt,
  deletedAt,
}: {
  lockedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
}): BusinessRecordState {
  if (deletedAt) {
    return "trash";
  }

  if (lockedAt) {
    return "locked";
  }

  if (archivedAt) {
    return "archived";
  }

  return "active";
}

export function isOperationalBusinessRecordState(
  state: BusinessRecordState,
) {
  return state === "active";
}
