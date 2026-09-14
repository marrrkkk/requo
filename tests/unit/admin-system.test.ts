import { describe, expect, it } from "vitest";

import {
  ADMIN_ACTIONS,
  ADMIN_TARGET_TYPES,
} from "@/features/admin/constants";
import { adminAuditLogListFiltersSchema } from "@/features/admin/schemas";

describe("adminAuditLogListFiltersSchema", () => {
  it("parses the full filter set", () => {
    expect(
      adminAuditLogListFiltersSchema.parse({
        adminUserId: "admin_1",
        action: "user.suspend",
        targetType: "user",
        targetId: "user_9",
      }),
    ).toMatchObject({
      adminUserId: "admin_1",
      action: "user.suspend",
      targetType: "user",
      targetId: "user_9",
      page: 1,
    });
  });

  it("keeps historical actions filterable after their routes are gone", () => {
    // `/admin/subscriptions` and `/admin/system` no longer exist, but rows
    // written by those pages must stay queryable.
    expect(
      adminAuditLogListFiltersSchema.parse({ action: "view.subscription" }),
    ).toMatchObject({ action: "view.subscription" });
    expect(
      adminAuditLogListFiltersSchema.parse({ action: "view.system" }),
    ).toMatchObject({ action: "view.system" });
  });

  it("drops unknown actions and target types instead of rejecting", () => {
    const parsed = adminAuditLogListFiltersSchema.parse({
      action: "bogus.action",
      targetType: "bogus",
    });

    expect(parsed.action).toBeUndefined();
    expect(parsed.targetType).toBeUndefined();
  });
});

describe("audit action catalogue", () => {
  it("keeps every action and target type in the catalogue", () => {
    // The audit toolbar builds its options straight from these arrays,
    // so their contents are the coverage assertion.
    expect(ADMIN_ACTIONS).toContain("view.subscription");
    expect(ADMIN_ACTIONS).toContain("view.system");
    expect(ADMIN_ACTIONS).toContain("confirmation.failed");
    expect(ADMIN_TARGET_TYPES).toContain("audit-log");
  });
});
