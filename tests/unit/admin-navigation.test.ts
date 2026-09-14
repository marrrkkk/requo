import { describe, expect, it } from "vitest";

import {
  ADMIN_AI_ERRORS_PATH,
  ADMIN_AI_PATH,
  ADMIN_AI_PROVIDERS_PATH,
  ADMIN_AI_REQUESTS_PATH,
  ADMIN_AUDIT_LOGS_PATH,
  ADMIN_BUSINESSES_PATH,
  ADMIN_EMAILS_PATH,
  ADMIN_INQUIRIES_PATH,
  ADMIN_QUOTES_PATH,
  ADMIN_ROOT_PATH,
  ADMIN_SETTINGS_PATH,
  ADMIN_USAGE_PATH,
  ADMIN_USERS_PATH,
  adminNavigation,
  adminNavigationGroups,
  getActiveAdminNavigationItem,
  getAdminBreadcrumbs,
  getAdminSidebarNavGroups,
  getAdminUserDetailPath,
  isAdminNavigationItemActive,
} from "@/features/admin/navigation";

const EXPECTED_GROUP_LABELS = [
  "Overview",
  "Customers",
  "Product",
  "AI",
  "Operations",
  "System",
];

const EXPECTED_HREFS = [
  ADMIN_ROOT_PATH,
  ADMIN_BUSINESSES_PATH,
  ADMIN_USERS_PATH,
  ADMIN_INQUIRIES_PATH,
  ADMIN_QUOTES_PATH,
  ADMIN_AI_PATH,
  ADMIN_AI_REQUESTS_PATH,
  ADMIN_AI_PROVIDERS_PATH,
  ADMIN_AI_ERRORS_PATH,
  ADMIN_EMAILS_PATH,
  ADMIN_USAGE_PATH,
  ADMIN_AUDIT_LOGS_PATH,
  ADMIN_SETTINGS_PATH,
];

describe("features/admin/navigation", () => {
  it("exposes the agreed group order", () => {
    expect(adminNavigationGroups.map((group) => group.label)).toEqual(
      EXPECTED_GROUP_LABELS,
    );
  });

  it("covers every admin section exactly once", () => {
    const hrefs = adminNavigation.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(expect.arrayContaining(EXPECTED_HREFS));
  });

  it("gives every nav item a label, description, and icon", () => {
    for (const item of adminNavigation) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.icon).toBeTruthy();
    }
  });

  it("projects onto the shared sidebar group shape", () => {
    const groups = getAdminSidebarNavGroups();

    expect(groups.map((group) => group.label)).toEqual(EXPECTED_GROUP_LABELS);

    for (const item of groups.flatMap((group) => group.items)) {
      expect(item.key).toBe(item.href);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeTruthy();
    }
  });

  describe("isAdminNavigationItemActive", () => {
    it("matches the overview root only exactly", () => {
      expect(isAdminNavigationItemActive(ADMIN_ROOT_PATH, ADMIN_ROOT_PATH)).toBe(
        true,
      );
      expect(isAdminNavigationItemActive(ADMIN_USERS_PATH, ADMIN_ROOT_PATH)).toBe(
        false,
      );
    });

    it("matches a section and its nested paths", () => {
      expect(isAdminNavigationItemActive(ADMIN_USERS_PATH, ADMIN_USERS_PATH)).toBe(
        true,
      );
      expect(isAdminNavigationItemActive("/users/u1", ADMIN_USERS_PATH)).toBe(true);
      expect(
        isAdminNavigationItemActive(ADMIN_BUSINESSES_PATH, ADMIN_USERS_PATH),
      ).toBe(false);
    });
  });

  describe("getActiveAdminNavigationItem", () => {
    it("returns the longest match so /ai/requests beats /ai", () => {
      expect(getActiveAdminNavigationItem(ADMIN_AI_REQUESTS_PATH)?.href).toBe(
        ADMIN_AI_REQUESTS_PATH,
      );
      expect(getActiveAdminNavigationItem(ADMIN_AI_PROVIDERS_PATH)?.href).toBe(
        ADMIN_AI_PROVIDERS_PATH,
      );
      expect(getActiveAdminNavigationItem(ADMIN_AI_ERRORS_PATH)?.href).toBe(
        ADMIN_AI_ERRORS_PATH,
      );
      expect(getActiveAdminNavigationItem(ADMIN_AI_PATH)?.href).toBe(
        ADMIN_AI_PATH,
      );
    });

    it("resolves a detail page to its section", () => {
      expect(getActiveAdminNavigationItem("/users/u1")?.href).toBe(
        ADMIN_USERS_PATH,
      );
      expect(getActiveAdminNavigationItem("/quotes/q1")?.href).toBe(
        ADMIN_QUOTES_PATH,
      );
      expect(getActiveAdminNavigationItem("/emails/e1")?.href).toBe(
        ADMIN_EMAILS_PATH,
      );
    });

    it("returns undefined for a route outside the navigation", () => {
      expect(getActiveAdminNavigationItem("/not-a-section")).toBeUndefined();
    });
  });

  describe("getAdminBreadcrumbs", () => {
    it("returns a single crumb on the overview", () => {
      expect(getAdminBreadcrumbs(ADMIN_ROOT_PATH)).toEqual([
        { label: "Overview" },
      ]);
    });

    it("links the overview for a list page", () => {
      expect(getAdminBreadcrumbs(ADMIN_USERS_PATH)).toEqual([
        { label: "Overview", href: ADMIN_ROOT_PATH },
        { label: "Users" },
      ]);
    });

    it("links back to the section from a detail page", () => {
      expect(getAdminBreadcrumbs("/users/u1")).toEqual([
        { label: "Overview", href: ADMIN_ROOT_PATH },
        { label: "Users", href: ADMIN_USERS_PATH },
        { label: "User detail" },
      ]);
    });

    it("names the AI sub-pages explicitly", () => {
      expect(getAdminBreadcrumbs(ADMIN_AI_PROVIDERS_PATH)).toEqual([
        { label: "Overview", href: ADMIN_ROOT_PATH },
        { label: "AI", href: ADMIN_AI_PATH },
        { label: "Providers" },
      ]);
    });

    it("falls back to a generic trail for an unknown section", () => {
      expect(getAdminBreadcrumbs("/not-a-section/thing")).toEqual([
        { label: "Overview", href: ADMIN_ROOT_PATH },
        { label: "Admin" },
      ]);
    });
  });

  it("builds the user detail path", () => {
    expect(getAdminUserDetailPath("u1")).toBe(`${ADMIN_USERS_PATH}/u1`);
  });
});
