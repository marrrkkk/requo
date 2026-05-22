import { describe, it, expect } from "vitest";
import { validateBusinessSlug } from "@/features/businesses/validation";

describe("features/businesses/validation", () => {
  describe("validateBusinessSlug", () => {
    it("accepts valid lowercase alphanumeric slugs", () => {
      expect(validateBusinessSlug("acme-plumbing")).toEqual({ valid: true });
      expect(validateBusinessSlug("my-biz-123")).toEqual({ valid: true });
      expect(validateBusinessSlug("a")).toEqual({ valid: true });
    });

    it("rejects slugs with uppercase characters", () => {
      const result = validateBusinessSlug("Acme-Plumbing");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/lowercase/i);
    });

    it("rejects slugs with spaces or special characters", () => {
      expect(validateBusinessSlug("acme plumbing").valid).toBe(false);
      expect(validateBusinessSlug("acme_plumbing").valid).toBe(false);
      expect(validateBusinessSlug("acme.plumbing").valid).toBe(false);
      expect(validateBusinessSlug("acme/plumbing").valid).toBe(false);
    });

    it("rejects empty slugs", () => {
      expect(validateBusinessSlug("").valid).toBe(false);
    });

    it("rejects reserved route segments", () => {
      const result = validateBusinessSlug("admin");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/unavailable/i);
    });

    it("rejects other reserved segments", () => {
      expect(validateBusinessSlug("api").valid).toBe(false);
      expect(validateBusinessSlug("login").valid).toBe(false);
      expect(validateBusinessSlug("businesses").valid).toBe(false);
      expect(validateBusinessSlug("onboarding").valid).toBe(false);
      expect(validateBusinessSlug("account").valid).toBe(false);
    });

    it("accepts slugs that look like reserved words but are not", () => {
      expect(validateBusinessSlug("admin-pro").valid).toBe(true);
      expect(validateBusinessSlug("my-account").valid).toBe(true);
      expect(validateBusinessSlug("api-testing").valid).toBe(true);
    });
  });
});
