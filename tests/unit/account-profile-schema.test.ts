import { describe, expect, it } from "vitest";

import { accountProfileSchema } from "@/features/account/schemas";

/**
 * Regression guard: the profile settings page renders only the name and the
 * avatar, but used to round-trip `jobTitle` and `phone` through hidden inputs.
 * A user whose `profiles.job_title` was NULL — the normal case for OAuth
 * sign-ups and for anyone who skipped the optional onboarding field — got
 * "Enter your role or title." and could not save a name change at all.
 */
describe("features/account/schemas accountProfileSchema", () => {
  it("accepts a name-only submission without job title or phone fields", () => {
    const result = accountProfileSchema.safeParse({
      fullName: "Mark Johnson",
      avatar: undefined,
      removeAvatar: "false",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      fullName: "Mark Johnson",
      avatar: undefined,
      removeAvatar: false,
    });
  });

  it("ignores a blank job title passthrough instead of rejecting the save", () => {
    const result = accountProfileSchema.safeParse({
      fullName: "Mark Johnson",
      jobTitle: "",
      phone: "",
      avatar: undefined,
      removeAvatar: "false",
    });

    expect(result.success).toBe(true);
  });

  it("still requires a full name", () => {
    const result = accountProfileSchema.safeParse({
      fullName: "M",
      avatar: undefined,
      removeAvatar: "false",
    });

    expect(result.success).toBe(false);
    expect(
      result.success ? undefined : result.error.flatten().fieldErrors.fullName,
    ).toEqual(["Enter your full name."]);
  });
});
