import { describe, expect, it } from "vitest";

import { normalizeReferrer } from "./normalize-referrer";

const appOrigin = "https://app.requo.io";

describe("normalizeReferrer", () => {
  it('returns "direct" for empty string', () => {
    expect(normalizeReferrer("", appOrigin)).toBe("direct");
  });

  it('returns "direct" for null', () => {
    expect(normalizeReferrer(null, appOrigin)).toBe("direct");
  });

  it('returns "direct" for undefined', () => {
    expect(normalizeReferrer(undefined, appOrigin)).toBe("direct");
  });

  it('returns "direct" for whitespace-only string', () => {
    expect(normalizeReferrer("   ", appOrigin)).toBe("direct");
  });

  it('returns "direct" for same-origin referrer', () => {
    expect(normalizeReferrer("https://app.requo.io/some-page", appOrigin)).toBe("direct");
  });

  it('returns "direct" for same-origin with different path', () => {
    expect(normalizeReferrer("https://app.requo.io/inquire/form-1", appOrigin)).toBe("direct");
  });

  it("returns domain for external referrer", () => {
    expect(normalizeReferrer("https://www.google.com/search?q=quotes", appOrigin)).toBe(
      "www.google.com",
    );
  });

  it("returns domain for another external referrer", () => {
    expect(normalizeReferrer("https://twitter.com/status/12345", appOrigin)).toBe("twitter.com");
  });

  it("returns domain for http referrer", () => {
    expect(normalizeReferrer("http://example.com/page", appOrigin)).toBe("example.com");
  });

  it('returns "direct" for invalid URL', () => {
    expect(normalizeReferrer("not-a-valid-url", appOrigin)).toBe("direct");
  });

  it("handles null appOrigin gracefully (no same-origin check)", () => {
    expect(normalizeReferrer("https://somesite.com/page", null)).toBe("somesite.com");
  });

  it("handles undefined appOrigin gracefully", () => {
    expect(normalizeReferrer("https://somesite.com/page", undefined)).toBe("somesite.com");
  });

  it("differentiates ports for same-origin check", () => {
    expect(normalizeReferrer("https://app.requo.io:8080/page", appOrigin)).toBe(
      "app.requo.io",
    );
  });
});
