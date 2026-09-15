import { describe, expect, it } from "vitest";

import {
  adminEmailsListFiltersSchema,
  adminUsageFiltersSchema,
} from "@/features/admin/schemas";

describe("adminEmailsListFiltersSchema", () => {
  it("parses the full filter set with the q alias", () => {
    expect(
      adminEmailsListFiltersSchema.parse({
        q: "welcome",
        status: "failed",
        emailType: "quote",
        provider: "resend",
      }),
    ).toMatchObject({
      search: "welcome",
      status: "failed",
      emailType: "quote",
      provider: "resend",
      page: 1,
    });
  });

  it("drops unknown enum values instead of rejecting", () => {
    const parsed = adminEmailsListFiltersSchema.parse({
      status: "bogus",
      emailType: "bogus",
      provider: "bogus",
    });

    expect(parsed.status).toBeUndefined();
    expect(parsed.emailType).toBeUndefined();
    expect(parsed.provider).toBeUndefined();
  });
});

describe("adminUsageFiltersSchema", () => {
  it("accepts the supported day ranges and resources", () => {
    expect(
      adminUsageFiltersSchema.parse({ days: "7", resource: "quotes" }),
    ).toEqual({ days: 7, resource: "quotes" });
    expect(adminUsageFiltersSchema.parse({ days: "30" })).toMatchObject({
      days: 30,
    });
  });

  it("drops unsupported ranges and resources", () => {
    expect(adminUsageFiltersSchema.parse({ days: "365" })).toEqual({});
    expect(adminUsageFiltersSchema.parse({ resource: "storage" })).toEqual({});
    expect(adminUsageFiltersSchema.parse({})).toEqual({});
  });
});
