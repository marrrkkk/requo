import { describe, expect, it } from "vitest";

import {
  applyPackMissingInfoCriticality,
  buildPackGuidanceSection,
} from "@/features/businesses/pack-guidance";

describe("pack guidance", () => {
  it("builds a versioned section per pack and null when unpacked", () => {
    const section = buildPackGuidanceSection("fabrication_signage", null);

    expect(section?.pack).toBe("fabrication_signage");
    expect(section?.version).toBe(1);
    expect(section?.text).toContain("fabrication_signage");
    expect(section?.text).toContain("product data");

    expect(buildPackGuidanceSection(null, null)).toBeNull();
  });

  it("overlays criticality without adding, removing, or rewording items", () => {
    const items = [
      { label: "Dimensions", question: "What are the dimensions?", critical: false },
      { label: "Nickname", question: "What is your nickname?", critical: false },
    ];

    const result = applyPackMissingInfoCriticality(items, "fabrication_signage", null);

    expect(result).toHaveLength(2);
    expect(result[0]?.critical).toBe(true);
    expect(result[0]?.question).toBe("What are the dimensions?");
    expect(result[1]?.critical).toBe(false);
  });

  it("leaves items untouched when unpacked", () => {
    const items = [{ label: "X", question: "Y?", critical: false }];

    expect(applyPackMissingInfoCriticality(items, null, null)).toBe(items);
  });
});
