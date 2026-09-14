import { describe, expect, it } from "vitest";

import {
  getDisplayFirstName,
  isSingleTokenName,
  joinFullName,
  splitFullName,
} from "@/features/account/name";

describe("features/account/name", () => {
  it("splits a full name into first and last", () => {
    expect(splitFullName("Alicia Cruz")).toEqual({
      firstName: "Alicia",
      lastName: "Cruz",
    });
    expect(splitFullName("Mary Kay Smith")).toEqual({
      firstName: "Mary",
      lastName: "Kay Smith",
    });
  });

  it("supports a first name without a last name", () => {
    expect(splitFullName("Madonna")).toEqual({
      firstName: "Madonna",
      lastName: "",
    });
    expect(splitFullName("  Madonna  ")).toEqual({
      firstName: "Madonna",
      lastName: "",
    });
    expect(splitFullName("")).toEqual({ firstName: "", lastName: "" });
  });

  it("joins first and last names without stray spacing", () => {
    expect(joinFullName("Alicia", "Cruz")).toBe("Alicia Cruz");
    expect(joinFullName("Madonna", "")).toBe("Madonna");
    expect(joinFullName("  Alicia  ", "  Cruz  ")).toBe("Alicia Cruz");
  });

  it("detects single-token names", () => {
    expect(isSingleTokenName("Madonna")).toBe(true);
    expect(isSingleTokenName("Alicia Cruz")).toBe(false);
    expect(isSingleTokenName("")).toBe(false);
  });

  it("prefers the first name for display", () => {
    expect(
      getDisplayFirstName({ firstName: "Alicia", fullName: "Alicia Cruz" }),
    ).toBe("Alicia");
    expect(getDisplayFirstName({ fullName: "Madonna" })).toBe("Madonna");
    expect(getDisplayFirstName({ userName: "Alicia Cruz" })).toBe("Alicia");
    expect(getDisplayFirstName({ fallback: "Requo" })).toBe("Requo");
  });
});
