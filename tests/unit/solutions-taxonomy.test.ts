import { describe, expect, it } from "vitest";

import {
  fallbackBusinessType,
  getSolutionDetail,
  secondaryBusinessTypes,
  solutionBusinessTypes,
  solutionLinks,
} from "@/components/marketing/solutions-data";
import {
  businessTypes,
  isBusinessType,
  normalizeBusinessType,
} from "@/features/inquiries/business-types";

describe("solutions taxonomy", () => {
  it("maps every primary solution to valid business types with matching pages", () => {
    for (const [slug, types] of Object.entries(solutionBusinessTypes)) {
      expect(
        solutionLinks.some((link) => link.slug === slug),
        `${slug} needs a solution link`,
      ).toBe(true);
      expect(getSolutionDetail(slug), `${slug} needs solution detail`).toBeDefined();
      expect(types.length).toBeGreaterThan(0);
      for (const type of types) {
        expect(isBusinessType(type)).toBe(true);
      }
    }
  });

  it("keeps secondary types supported and out of the primary mapping", () => {
    const primary = new Set(Object.values(solutionBusinessTypes).flat());
    for (const type of secondaryBusinessTypes) {
      expect(businessTypes).toContain(type);
      expect(primary.has(type)).toBe(false);
    }
    expect(fallbackBusinessType).toBe("general_project_services");
  });

  it("still normalizes legacy and unknown stored business types", () => {
    expect(normalizeBusinessType("home_services")).toBe(
      "contractor_home_improvement",
    );
    expect(normalizeBusinessType("nope")).toBe("general_project_services");
  });
});
