import { describe, expect, it } from "vitest";

import {
  BEHAVIOR_PACK_VERSION,
  behaviorPackDefinitions,
  behaviorPackKeys,
  getBehaviorPack,
  isBehaviorPackKey,
  isSecondaryBusinessType,
  secondaryBusinessTypes,
} from "@/features/businesses/behavior-packs";
import {
  getStarterTemplateBusinessType,
} from "@/features/businesses/starter-templates";
import {
  businessTypes,
  legacyBusinessTypeMap,
  legacyBusinessTypes,
} from "@/features/inquiries/business-types";

describe("behavior packs", () => {
  it("defines exactly six packs with member types and solution slugs", () => {
    expect(behaviorPackKeys).toHaveLength(6);
    expect(BEHAVIOR_PACK_VERSION).toBe(1);

    for (const key of behaviorPackKeys) {
      const definition = behaviorPackDefinitions[key];
      expect(definition.key).toBe(key);
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.solutionSlug.length).toBeGreaterThan(0);
      expect(definition.memberTypes.length).toBeGreaterThan(0);
    }
  });

  it("covers every primary stored type exactly once", () => {
    const primaries = businessTypes.filter(
      (type) => !isSecondaryBusinessType(type),
    );
    const covered = behaviorPackKeys.flatMap(
      (key) => behaviorPackDefinitions[key].memberTypes,
    );

    expect(new Set(covered).size).toBe(covered.length);
    expect([...covered].sort()).toEqual([...primaries].sort());
  });

  it("resolves the specified pack membership", () => {
    expect(getBehaviorPack("contractor_home_improvement")).toBe(
      "contractors_home_services",
    );
    expect(getBehaviorPack("repair_services")).toBe(
      "contractors_home_services",
    );
    expect(getBehaviorPack("creative_marketing_services")).toBe(
      "creative_marketing",
    );
    expect(getBehaviorPack("web_it_services")).toBe("professional_it");
    expect(getBehaviorPack("consulting_professional_services")).toBe(
      "professional_it",
    );
    expect(getBehaviorPack("photo_video_production")).toBe("photo_video");
    expect(getBehaviorPack("event_services_rentals")).toBe("events_rentals");
    expect(getBehaviorPack("print_signage")).toBe("fabrication_signage");
    expect(getBehaviorPack("fabrication_custom_build")).toBe(
      "fabrication_signage",
    );
  });

  it("leaves secondary types unpacked (legacy behavior preserved)", () => {
    for (const type of secondaryBusinessTypes) {
      expect(getBehaviorPack(type)).toBeNull();
    }

    expect(getBehaviorPack("cleaning_services")).toBeNull();
    expect(getBehaviorPack("general_project_services")).toBeNull();
  });

  it("normalizes legacy values non-destructively through the same resolver", () => {
    for (const legacy of legacyBusinessTypes) {
      expect(getBehaviorPack(legacy)).toBe(
        getBehaviorPack(legacyBusinessTypeMap[legacy]),
      );
    }

    expect(getBehaviorPack("home_services")).toBe("contractors_home_services");
    expect(getBehaviorPack("photo_video_events")).toBe("photo_video");
  });

  it("fails closed to unpacked for unknown values", () => {
    expect(getBehaviorPack(undefined)).toBeNull();
    expect(getBehaviorPack(null)).toBeNull();
    expect(getBehaviorPack("nope")).toBeNull();
    expect(getBehaviorPack(42)).toBeNull();
  });

  it("does not collapse pack membership into starter-template membership", () => {
    // Guard against the known drift mode (strategy §B2c): e.g. web/IT work
    // seeds from the creative starter template but is governed by the
    // professional pack.
    expect(getStarterTemplateBusinessType("web_it_services")).toBe(
      "creative_marketing_services",
    );
    expect(getBehaviorPack("web_it_services")).toBe("professional_it");
  });

  it("validates pack keys", () => {
    for (const key of behaviorPackKeys) {
      expect(isBehaviorPackKey(key)).toBe(true);
    }

    expect(isBehaviorPackKey("contractors")).toBe(false);
    expect(isBehaviorPackKey(null)).toBe(false);
    expect(isBehaviorPackKey(undefined)).toBe(false);
  });
});
